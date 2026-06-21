import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import pandas as pd
from database import get_db
import models
from auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    now = datetime.datetime.utcnow()
    today_start = datetime.datetime(now.year, now.month, now.day)
    month_start = datetime.datetime(now.year, now.month, 1)

    total_farmers = db.query(models.Farmer).count()
    total_bills = db.query(models.Bill).count()
    total_bags = db.query(func.sum(models.Bill.bags)).scalar() or 0

    # Total paid to farmers is defined as Net Payable + Advance Paid
    total_net_payable = db.query(func.sum(models.Bill.net_payable)).scalar() or 0.0
    total_advance_paid = db.query(func.sum(models.Bill.advance_paid)).scalar() or 0.0
    total_paid_to_farmers = total_net_payable + total_advance_paid

    total_received_mill = db.query(func.sum(models.MillLedger.amount_received)).scalar() or 0.0
    office_balance = total_received_mill - total_paid_to_farmers

    # Today's billing (Net + Advance)
    today_bills = db.query(models.Bill).filter(models.Bill.date_time >= today_start).all()
    today_billing_total = sum(b.net_payable + b.advance_paid for b in today_bills)

    # Monthly billing (Net + Advance)
    monthly_bills = db.query(models.Bill).filter(models.Bill.date_time >= month_start).all()
    monthly_billing_total = sum(b.net_payable + b.advance_paid for b in monthly_bills)

    return {
        "total_farmers": total_farmers,
        "total_bills": total_bills,
        "total_bags": total_bags,
        "total_amount_paid": round(total_paid_to_farmers, 2),
        "total_amount_received": round(total_received_mill, 2),
        "office_balance": round(office_balance, 2),
        "today_billing_total": round(today_billing_total, 2),
        "monthly_billing_total": round(monthly_billing_total, 2)
    }

@router.get("/charts")
def get_chart_data(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Monthly purchase & payment chart (last 6 months)
    six_months_ago = datetime.datetime.utcnow() - datetime.timedelta(days=180)
    
    # Query bills by month
    bills_query = db.query(
        func.strftime("%Y-%m", models.Bill.date_time).label("month"),
        func.sum(models.Bill.bags).label("bags"),
        func.sum(models.Bill.net_payable + models.Bill.advance_paid).label("paid")
    ).filter(models.Bill.date_time >= six_months_ago).group_by("month").all()

    # Query mill ledger by month
    ledger_query = db.query(
        func.strftime("%Y-%m", models.MillLedger.date).label("month"),
        func.sum(models.MillLedger.amount_received).label("received")
    ).filter(models.MillLedger.date >= six_months_ago).group_by("month").all()

    # Merge monthly data
    monthly_map = {}
    for r in bills_query:
        monthly_map[r.month] = {"month": r.month, "bags": r.bags or 0, "paid": round(r.paid or 0.0, 2), "received": 0.0}
    for r in ledger_query:
        if r.month in monthly_map:
            monthly_map[r.month]["received"] = round(r.received or 0.0, 2)
        else:
            monthly_map[r.month] = {"month": r.month, "bags": 0, "paid": 0.0, "received": round(r.received or 0.0, 2)}

    monthly_data = sorted(list(monthly_map.values()), key=lambda x: x["month"])

    # 2. Farmer-wise purchase chart (Top 5 farmers by bags)
    farmer_query = db.query(
        models.Farmer.name.label("farmer_name"),
        func.sum(models.Bill.bags).label("bags")
    ).join(models.Bill).group_by(models.Farmer.id).order_by(func.sum(models.Bill.bags).desc()).limit(5).all()

    farmer_data = [{"farmer_name": r.farmer_name, "bags": r.bags or 0} for r in farmer_query]

    # 3. Village-wise purchase chart (Top 5 villages by bags)
    village_query = db.query(
        models.Farmer.village.label("village"),
        func.sum(models.Bill.bags).label("bags")
    ).join(models.Bill).group_by(models.Farmer.village).order_by(func.sum(models.Bill.bags).desc()).limit(5).all()

    village_data = [{"village": r.village, "bags": r.bags or 0} for r in village_query]

    return {
        "monthly_chart": monthly_data,
        "farmer_chart": farmer_data,
        "village_chart": village_data
    }

# Reports Generators
@router.get("/generate")
def generate_report(
    report_type: str = Query(..., description="daily, monthly, yearly, farmer, village"),
    farmer_id: int = Query(None, description="Required for farmer report_type"),
    village: str = Query(None, description="Required for village report_type"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    export: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Query base data
    bill_query = db.query(models.Bill).join(models.Farmer)
    ledger_query = db.query(models.MillLedger)

    # Date filters
    if start_date:
        sd = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        bill_query = bill_query.filter(models.Bill.date_time >= sd)
        ledger_query = ledger_query.filter(models.MillLedger.date >= sd)
    if end_date:
        ed = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
        bill_query = bill_query.filter(models.Bill.date_time < ed)
        ledger_query = ledger_query.filter(models.MillLedger.date < ed)

    # Type filters
    if report_type == "farmer":
        if not farmer_id:
            raise HTTPException(400, "farmer_id is required for farmer report")
        bill_query = bill_query.filter(models.Bill.farmer_id == farmer_id)
        # Mill ledger cannot be filtered by farmer directly since it's global received amount,
        # but we represent it as 0 received specifically for farmer report
        ledger_query = ledger_query.filter(models.MillLedger.id == -1)
    elif report_type == "village":
        if not village:
            raise HTTPException(400, "village is required for village report")
        bill_query = bill_query.filter(models.Farmer.village == village)
        ledger_query = ledger_query.filter(models.MillLedger.id == -1)

    bills = bill_query.all()
    ledger = ledger_query.all()

    # Summarize
    total_bags = sum(b.bags for b in bills)
    total_gross = sum(b.gross_total for b in bills)
    total_deductions = sum(b.cc_deduction + b.hamali for b in bills)
    total_net_paid = sum(b.net_payable + b.advance_paid for b in bills)
    total_mill_received = sum(l.amount_received for l in ledger)
    
    # Office Balance: Only applicable for general reports, otherwise negative offset of farmer/village outflow
    office_balance = total_mill_received - total_net_paid

    report_summary = {
        "total_bags": total_bags,
        "total_gross": round(total_gross, 2),
        "total_deductions": round(total_deductions, 2),
        "total_net_paid": round(total_net_paid, 2),
        "total_mill_received": round(total_mill_received, 2),
        "office_balance": round(office_balance, 2)
    }

    if not export:
        return {
            "summary": report_summary,
            "bills": [
                {
                    "bill_number": b.bill_number,
                    "date": b.date_time.strftime("%Y-%m-%d %H:%M"),
                    "farmer_name": b.farmer.name,
                    "village": b.farmer.village,
                    "bags": b.bags,
                    "gross_total": b.gross_total,
                    "deductions": b.cc_deduction + b.hamali,
                    "net_paid": b.net_payable + b.advance_paid
                } for b in bills
            ],
            "ledger": [
                {
                    "date": l.date.strftime("%Y-%m-%d %H:%M"),
                    "amount": l.amount_received,
                    "reference": l.reference_number,
                    "notes": l.notes or ""
                } for l in ledger
            ]
        }

    # Excel export flow
    bills_data = []
    for b in bills:
        bills_data.append({
            "Bill Number": b.bill_number,
            "Date": b.date_time.strftime("%Y-%m-%d %H:%M"),
            "Farmer Name": b.farmer.name,
            "Village": b.farmer.village,
            "Bags": b.bags,
            "Gross Total (Rs)": b.gross_total,
            "Deductions (CC+Hamali)": b.cc_deduction + b.hamali,
            "Net Paid to Farmer (Rs)": b.net_payable + b.advance_paid
        })
    df_bills = pd.DataFrame(bills_data)

    ledger_data = []
    for l in ledger:
        ledger_data.append({
            "Date": l.date.strftime("%Y-%m-%d %H:%M"),
            "Amount Received (Rs)": l.amount_received,
            "Reference / UTR": l.reference_number,
            "Notes": l.notes or ""
        })
    df_ledger = pd.DataFrame(ledger_data)

    summary_data = [{
        "Report Type": report_type.capitalize(),
        "Total Bags": total_bags,
        "Total Gross (Rs)": total_gross,
        "Total Deductions (Rs)": total_deductions,
        "Total Net Paid to Farmers (Rs)": total_net_paid,
        "Total Mill Received (Rs)": total_mill_received,
        "Office Balance (Rs)": office_balance
    }]
    df_summary = pd.DataFrame(summary_data)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name='Summary', index=False)
        df_bills.to_excel(writer, sheet_name='Paddy Bills', index=False)
        df_ledger.to_excel(writer, sheet_name='Mill Received', index=False)
        
        # Simple styling
        for sheet_name in ['Summary', 'Paddy Bills', 'Mill Received']:
            ws = writer.sheets[sheet_name]
            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = col[0].column_letter
                ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output.seek(0)
    filename = f"report_{report_type}_{datetime.datetime.now().strftime('%Y%m%d%H%M')}.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
