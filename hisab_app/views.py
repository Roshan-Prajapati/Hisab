from django.shortcuts import render
from .forms import EntryForm
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import TransportEntry
from decimal import Decimal
from datetime import datetime


# Create your views here.



# def entry_view(request):
#     form = EntryForm()
#     return render(request, 'entry_form.html', {'form': form})


def hisab_table_view(request):
    return render(request, 'hisab_table.html')

@csrf_exempt
def autosave_entry(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            entry_id = data.get("id")  # If row already exists
            date = data.get("date")
            vehicle_driver = data.get("vehicle_driver", "").strip()
            location = data.get("location", "").strip()
            weight_tons = float(data.get("weight_tons") or 0)
            rate_per_ton = float(data.get("rate_per_ton") or 0)
            amount = float(data.get("amount") or 0)
            deductions = data.get("deductions", "[]")  # JSON string from frontend
            final_amount = float(data.get("final_amount") or 0)

            # Parse date if provided
            if date:
                try:
                    date = datetime.strptime(date, "%Y-%m-%d").date()
                except ValueError:
                    date = None

            if entry_id:  # Update existing entry
                entry = TransportEntry.objects.get(id=entry_id)
                entry.date = date
                entry.vehicle_driver = vehicle_driver
                entry.location = location
                entry.weight_tons = weight_tons
                entry.rate_per_ton = rate_per_ton
                entry.amount = amount
                entry.deductions = deductions
                entry.final_amount = final_amount
                entry.save()
            else:  # Create new entry
                entry = TransportEntry.objects.create(
                    date=date,
                    vehicle_driver=vehicle_driver,
                    location=location,
                    weight_tons=weight_tons,
                    rate_per_ton=rate_per_ton,
                    amount=amount,
                    deductions=deductions,
                    final_amount=final_amount,
                )

            return JsonResponse({"success": True, "id": entry.id})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"success": False, "message": "Invalid request"}, status=400)

@csrf_exempt
def delete_entry(request):
    if request.method == "POST":
        data = json.loads(request.body)
        entry_id = data.get("id")

        if entry_id:
            try:
                entry = TransportEntry.objects.get(id=entry_id)
                entry.delete()
                return JsonResponse({"status": "success"})
            except TransportEntry.DoesNotExist:
                return JsonResponse({"status": "error", "message": "Not found"}, status=404)

    return JsonResponse({"status": "error"}, status=400)