import os
import datetime
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, extract
from database import get_db
import models
import schemas
from auth import get_current_user, require_role

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

router = APIRouter(prefix="/api/bills", tags=["Billing"])

FONT_PATH = os.path.join(os.path.dirname(__file__), "NTR-Regular.ttf")

def download_telugu_font():
    if not os.path.exists(FONT_PATH):
        try:
            url = "https://raw.githubusercontent.com/google/fonts/main/ofl/ntr/NTR-Regular.ttf"
            r = requests.get(url, timeout=15)
            if r.status_code == 200:
                with open(FONT_PATH, "wb") as f:
                    f.write(r.content)
                print("Telugu font NTR-Regular.ttf downloaded successfully.")
            else:
                print("Failed to download font, status code:", r.status_code)
        except Exception as e:
            print("Error downloading Telugu font:", e)

# Download at import time so it's ready
download_telugu_font()

def get_font_name():
    if os.path.exists(FONT_PATH):
        try:
            pdfmetrics.registerFont(TTFont('NTR', FONT_PATH))
            return 'NTR'
        except Exception as e:
            print("Error registering font:", e)
    return 'Helvetica'

def generate_bill_number(db: Session) -> str:
    year = datetime.datetime.now().year
    # Count bills in the current year to determine sequence
    count = db.query(models.Bill).filter(
        extract('year', models.Bill.date_time) == year
    ).count()
    seq = count + 1
    return f"SSB-{year}-{seq:04d}"

def calculate_bill_values(data):
    bags = data.bags
    extra_kgs = data.extra_kgs
    input_rate = data.input_rate
    advance_paid = data.advance_paid
    cc_applied = data.cc_deduction

    if data.billing_mode == "75KG":
        adjusted_rate = round(input_rate * 68 / 75, 2)
        cost_per_kg = round(input_rate / 75, 4)
        bags_amount = round(adjusted_rate * bags, 2)
        extra_amount = round(cost_per_kg * extra_kgs, 2)
    else:  # 100KG
        adjusted_rate = input_rate  # not explicitly part of formula but default to rate
        cost_per_kg = round(input_rate / 100, 4)
        bags_amount = round(bags * 68 * cost_per_kg, 2)
        extra_amount = round(extra_kgs * cost_per_kg, 2)

    gross_total = round(bags_amount + extra_amount, 2)
    cc_deduction = round(gross_total * 0.01, 2) if cc_applied else 0.0
    hamali = round(bags * 5.0, 2)
    net_payable = round(gross_total - cc_deduction - hamali - advance_paid, 2)

    return {
        "adjusted_rate": adjusted_rate,
        "cost_per_kg": cost_per_kg,
        "bags_amount": bags_amount,
        "extra_amount": extra_amount,
        "gross_total": gross_total,
        "cc_deduction": cc_deduction,
        "hamali": hamali,
        "net_payable": net_payable
    }

@router.post("", response_model=schemas.BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill_in: schemas.BillCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "staff"]))
):
    farmer = db.query(models.Farmer).filter(models.Farmer.id == bill_in.farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    calc = calculate_bill_values(bill_in)
    bill_num = generate_bill_number(db)

    new_bill = models.Bill(
        bill_number=bill_num,
        farmer_id=bill_in.farmer_id,
        billing_mode=bill_in.billing_mode,
        bags=bill_in.bags,
        extra_kgs=bill_in.extra_kgs,
        input_rate=bill_in.input_rate,
        adjusted_rate=calc["adjusted_rate"],
        cost_per_kg=calc["cost_per_kg"],
        bags_amount=calc["bags_amount"],
        extra_amount=calc["extra_amount"],
        gross_total=calc["gross_total"],
        cc_deduction=calc["cc_deduction"],
        hamali=calc["hamali"],
        advance_paid=bill_in.advance_paid,
        net_payable=calc["net_payable"],
        language=bill_in.language,
        date_time=datetime.datetime.utcnow()
    )

    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)
    return new_bill

@router.get("", response_model=list[schemas.BillResponse])
def get_bills(
    q: str = Query(None, description="Search by bill number, farmer name, village, or mobile"),
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Bill).join(models.Farmer)
    
    if q:
        query = query.filter(
            or_(
                models.Bill.bill_number.ilike(f"%{q}%"),
                models.Farmer.name.ilike(f"%{q}%"),
                models.Farmer.phone.ilike(f"%{q}%"),
                models.Farmer.village.ilike(f"%{q}%")
            )
        )

    if start_date:
        sd = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        query = query.filter(models.Bill.date_time >= sd)
    if end_date:
        ed = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
        query = query.filter(models.Bill.date_time < ed)

    return query.order_by(models.Bill.date_time.desc()).all()

@router.put("/{bill_id}", response_model=schemas.BillResponse)
def update_bill(
    bill_id: int,
    bill_in: schemas.BillUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "staff"]))
):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    calc = calculate_bill_values(bill_in)

    bill.billing_mode = bill_in.billing_mode
    bill.bags = bill_in.bags
    bill.extra_kgs = bill_in.extra_kgs
    bill.input_rate = bill_in.input_rate
    bill.adjusted_rate = calc["adjusted_rate"]
    bill.cost_per_kg = calc["cost_per_kg"]
    bill.bags_amount = calc["bags_amount"]
    bill.extra_amount = calc["extra_amount"]
    bill.gross_total = calc["gross_total"]
    bill.cc_deduction = calc["cc_deduction"]
    bill.hamali = calc["hamali"]
    bill.advance_paid = bill_in.advance_paid
    bill.net_payable = calc["net_payable"]
    bill.language = bill_in.language

    db.commit()
    db.refresh(bill)
    return bill

@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
    return None

# PDF Receipt Generation
@router.get("/{bill_id}/pdf")
def download_bill_pdf(
    bill_id: int,
    lang: str = Query(None, description="Force language: en, te, both"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Use forced language if provided, otherwise the bill's saved language
    pdf_lang = lang if lang in ["en", "te", "both"] else bill.language
    font_name = get_font_name()

    pdf_filename = f"receipt_{bill.bill_number}.pdf"
    pdf_path = os.path.join(os.path.dirname(__file__), pdf_filename)

    # Letter is 612 x 792 points
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter

    # Draw Border
    c.setStrokeColor(colors.HexColor("#c5a880")) # Gold border
    c.setLineWidth(2)
    c.rect(20, 20, width - 40, height - 40)
    c.setStrokeColor(colors.HexColor("#2e7d32")) # Green inner border
    c.setLineWidth(0.75)
    c.rect(24, 24, width - 48, height - 48)

    # Top Agriculture Banner / Header
    c.setFillColor(colors.HexColor("#1b5e20")) # Dark Green Banner
    c.rect(25, height - 120, width - 50, 95, fill=1, stroke=0)

    # Title inside Banner
    c.setFillColor(colors.HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 60, "SRI SAI LAKSHMI OFFICE")
    
    # Subtitle or Telugu translation in Banner
    c.setFillColor(colors.HexColor("#d4af37")) # Gold Accent
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        c.setFont(font_name, 16)
        c.drawCentredString(width / 2, height - 85, "శ్రీ సాయి లక్ష్మి ఆఫీస్ - వరి బిల్లింగ్ సిస్టమ్")
    else:
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width / 2, height - 85, "Paddy Billing & Mill Ledger Management System")

    c.setFillColor(colors.HexColor("#ffffff"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 105, "Village/Mandal: Rice Mill Area | Contact: +91 9999999999")

    # Invoice Details Section
    c.setFillColor(colors.HexColor("#333333"))
    y_pos = height - 150

    # Bill details left/right
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y_pos, f"Bill No / బిల్లు సంఖ్య:")
    c.setFont("Helvetica", 10)
    c.drawString(160, y_pos, bill.bill_number)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(380, y_pos, "Date & Time / తేదీ:")
    c.setFont("Helvetica", 10)
    c.drawString(490, y_pos, bill.date_time.strftime("%d-%m-%Y %H:%M"))

    # Divider line
    y_pos -= 15
    c.setStrokeColor(colors.HexColor("#cccccc"))
    c.setLineWidth(0.5)
    c.line(40, y_pos, width - 40, y_pos)

    # Farmer Details
    y_pos -= 20
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#1b5e20"))
    c.drawString(40, y_pos, "Farmer Details / రైతు వివరాలు")
    c.setFillColor(colors.HexColor("#333333"))

    y_pos -= 20
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y_pos, "Farmer Name / పేరు:")
    c.drawString(380, y_pos, "Mobile / మొబైల్:")

    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        c.setFont(font_name, 11)
    else:
        c.setFont("Helvetica", 10)
    c.drawString(160, y_pos, bill.farmer.name)
    c.setFont("Helvetica", 10)
    c.drawString(490, y_pos, bill.farmer.phone)

    y_pos -= 18
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y_pos, "Village / గ్రామం:")
    c.drawString(380, y_pos, "Address / చిరునామా:")

    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        c.setFont(font_name, 11)
    else:
        c.setFont("Helvetica", 10)
    c.drawString(160, y_pos, bill.farmer.village)
    c.drawString(490, y_pos, bill.farmer.address)

    # Bank details if available
    if bill.farmer.bank_name or bill.farmer.bank_account:
        y_pos -= 18
        c.setFont("Helvetica-Bold", 10)
        c.drawString(40, y_pos, "Bank Account / బ్యాంకు:")
        c.setFont("Helvetica", 10)
        bank_details = f"{bill.farmer.bank_name or ''} - A/C: {bill.farmer.bank_account or ''} IFSC: {bill.farmer.bank_ifsc or ''}"
        c.drawString(160, y_pos, bank_details)

    # Divider line
    y_pos -= 15
    c.setStrokeColor(colors.HexColor("#cccccc"))
    c.line(40, y_pos, width - 40, y_pos)

    # Calculations Table Header
    y_pos -= 25
    c.setFillColor(colors.HexColor("#f1f8e9")) # Very light green background
    c.rect(40, y_pos - 15, width - 80, 25, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1b5e20"))

    # Table Header text
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y_pos - 8, "Item Description / వివరాలు")
    c.drawCentredString(280, y_pos - 8, "Qty / బస్తాలు-కేజీలు")
    c.drawCentredString(400, y_pos - 8, "Rate / ధర")
    c.drawRightString(width - 50, y_pos - 8, "Amount / మొత్తం (Rs.)")

    c.setFillColor(colors.HexColor("#333333"))
    table_start_y = y_pos - 15

    # 1. Bags Amount
    y_pos -= 35
    c.setFont("Helvetica", 10)
    desc_bags = f"Paddy Bags (75KG Mode)" if bill.billing_mode == "75KG" else f"Paddy Bags (100KG Mode)"
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        desc_bags += " / వడ్ల బస్తాలు"
        c.setFont(font_name, 10)
    c.drawString(50, y_pos, desc_bags)
    c.setFont("Helvetica", 10)
    # 75KG mode calculates bags * adjusted_rate. 100KG mode uses bags * 68 * cost_per_kg
    qty_bags_str = f"{bill.bags} Bags (68 KG net paid/bag)"
    c.drawCentredString(280, y_pos, qty_bags_str)
    c.drawCentredString(400, y_pos, f"Rs. {bill.input_rate}/{"75KG" if bill.billing_mode == "75KG" else "100KG"}")
    c.drawRightString(width - 50, y_pos, f"{bill.bags_amount:.2f}")

    # 2. Extra KGs Amount
    y_pos -= 20
    desc_extra = f"Extra KGs"
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        desc_extra += " / అదనపు కేజీలు"
        c.setFont(font_name, 10)
    c.drawString(50, y_pos, desc_extra)
    c.setFont("Helvetica", 10)
    c.drawCentredString(280, y_pos, f"{bill.extra_kgs:.2f} KGs")
    c.drawCentredString(400, y_pos, f"Rs. {bill.cost_per_kg:.4f}/KG")
    c.drawRightString(width - 50, y_pos, f"{bill.extra_amount:.2f}")

    # Divider line
    y_pos -= 15
    c.setStrokeColor(colors.HexColor("#e0e0e0"))
    c.line(40, y_pos, width - 40, y_pos)

    # 3. Gross Total
    y_pos -= 20
    c.setFont("Helvetica-Bold", 10)
    desc_gross = "Gross Total / స్థూల మొత్తం"
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        c.setFont(font_name, 11)
    c.drawString(50, y_pos, desc_gross)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(width - 50, y_pos, f"{bill.gross_total:.2f}")

    # 4. CC Deduction
    y_pos -= 20
    c.setFont("Helvetica", 10)
    desc_cc = f"CC Deduction (1% {"Applied" if bill.cc_deduction > 0 else "N/A"})"
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        desc_cc += " / సీసీ రుసుము"
        c.setFont(font_name, 10)
    c.drawString(50, y_pos, desc_cc)
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 50, y_pos, f"- {bill.cc_deduction:.2f}")

    # 5. Hamali
    y_pos -= 20
    desc_hamali = "Hamali Charges (Rs. 5.00/Bag)"
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        desc_hamali += " / హమాలీ ఖర్చులు"
        c.setFont(font_name, 10)
    c.drawString(50, y_pos, desc_hamali)
    c.setFont("Helvetica", 10)
    c.drawCentredString(280, y_pos, f"{bill.bags} Bags")
    c.drawRightString(width - 50, y_pos, f"- {bill.hamali:.2f}")

    # 6. Advance Paid
    y_pos -= 20
    desc_advance = "Advance Paid"
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        desc_advance += " / అడ్వాన్స్"
        c.setFont(font_name, 10)
    c.drawString(50, y_pos, desc_advance)
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 50, y_pos, f"- {bill.advance_paid:.2f}")

    # Divider line
    y_pos -= 15
    c.setStrokeColor(colors.HexColor("#2e7d32"))
    c.setLineWidth(1.5)
    c.line(40, y_pos, width - 40, y_pos)

    # 7. Net Payable
    y_pos -= 25
    c.setFillColor(colors.HexColor("#1b5e20"))
    c.setFont("Helvetica-Bold", 12)
    desc_net = "Net Payable Amount / రైతుకు నికర చెల్లింపు"
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        c.setFont(font_name, 13)
    c.drawString(50, y_pos, desc_net)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 50, y_pos, f"Rs. {bill.net_payable:.2f}")

    # Outer border for table
    c.setStrokeColor(colors.HexColor("#cccccc"))
    c.setLineWidth(0.5)
    c.rect(40, y_pos - 10, width - 80, table_start_y - (y_pos - 10))

    # Notes & Signatures
    y_pos -= 60
    c.setFillColor(colors.HexColor("#666666"))
    c.setFont("Helvetica-Oblique", 8)
    note_txt = "Note: This is an office generated billing receipt. Please check all calculations before leaving."
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        note_txt = "గమనిక: ఇది కంప్యూటర్ ద్వారా సృష్టించబడిన రశీదు. దయచేసి వివరాలు సరిచూసుకోగలరు."
        c.setFont(font_name, 9)
    c.drawString(40, y_pos, note_txt)

    y_pos -= 40
    c.setFillColor(colors.HexColor("#333333"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y_pos, "Farmer's Signature")
    c.drawRightString(width - 40, y_pos, "Authorized Representative")
    
    if pdf_lang in ["te", "both"] and font_name == 'NTR':
        c.setFont(font_name, 10)
        c.drawString(40, y_pos - 15, "రైతు సంతకం")
        c.drawRightString(width - 40, y_pos - 15, "అధికారిక ప్రతినిధి సంతకం")

    c.save()

    response = FileResponse(pdf_path, media_type='application/pdf', filename=pdf_filename)
    # Clean up file after sending
    # Fastapi handles file closing. We can delete it or leave it in backend/ folder as temp
    return response

# WhatsApp message builder helper
@router.get("/{bill_id}/whatsapp")
def get_whatsapp_text(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    date_str = bill.date_time.strftime("%d-%m-%Y")
    phone = bill.farmer.phone
    
    # Message templates (English and Telugu combined)
    deductions = bill.cc_deduction + bill.hamali
    msg = (
        f"*SRI SAI LAKSHMI OFFICE - PADDY BILL*\n"
        f"----------------------------------------\n"
        f"*Bill No:* {bill.bill_number}\n"
        f"*Date:* {date_str}\n"
        f"*Farmer:* {bill.farmer.name}\n"
        f"*Village:* {bill.farmer.village}\n"
        f"----------------------------------------\n"
        f"*Billing Mode:* {bill.billing_mode}\n"
        f"*Bags:* {bill.bags}\n"
        f"*Extra KGs:* {bill.extra_kgs}\n"
        f"*Gross Total:* Rs. {bill.gross_total:.2f}\n"
        f"*Deductions (CC + Hamali):* Rs. {deductions:.2f}\n"
        f"*Advance Paid:* Rs. {bill.advance_paid:.2f}\n"
        f"----------------------------------------\n"
        f"*Net Payable:* *Rs. {bill.net_payable:.2f}*\n\n"
        f"శ్రీ సాయి లక్ష్మి ఆఫీస్ బిల్లు వివరాలు:\n"
        f"బిల్లు నెంబర్: {bill.bill_number}\n"
        f"రైతు: {bill.farmer.name}\n"
        f"నికర చెల్లింపు: Rs. {bill.net_payable:.2f}\n"
        f"ధన్యవాదాలు! / Thank you!"
    )
    
    # Encode for URL
    import urllib.parse
    encoded_msg = urllib.parse.quote(msg)
    wa_link = f"https://wa.me/91{phone}?text={encoded_msg}"
    
    return {"phone": phone, "message": msg, "link": wa_link}
