from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from .forms import EntryForm
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json, time, random
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from .models import TransportEntry
from decimal import Decimal
from datetime import datetime
from django.contrib import messages



# Create your views here.



# def entry_view(request):
#     form = EntryForm()
#     return render(request, 'entry_form.html', {'form': form})



def user_signup(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")

        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken.")
            return redirect("signup")

        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already registered.")
            return redirect("signup")

        # Create user
        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()

        login(request, user)  # Auto login after signup
        return redirect("hisab_table")

    return render(request, "signup.html")



def user_login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        otp = request.POST.get("otp")

        user = authenticate(request, username=username, password=password)
        session_otp = request.session.get('otp')
        otp_time = request.session.get('otp_time')

        if user is not None:
            # Check OTP
            if not otp or not session_otp or otp != session_otp:
                return render(request, "login.html", {"error": "Invalid or missing OTP."})
            # Check OTP expiry (5 minutes = 300 seconds)
            if not otp_time or int(time.time()) - int(otp_time) > 300:
                return render(request, "login.html", {"error": "OTP expired. Please request a new one."})
            # OTP is valid
            login(request, user)
            # Clear OTP from session
            request.session.pop('otp', None)
            request.session.pop('otp_time', None)
            return redirect("hisab_table")
        else:
            return render(request, "login.html", {"error": "Invalid username or password."})

    return render(request, "login.html")


def user_logout(request):
    logout(request)  # end session
    return redirect("login")


@login_required(login_url="login")
def hisab_table_view(request):
    entries = TransportEntry.objects.all().order_by("-date")
    return render(request, "hisab_table.html", {"entries": entries})



@csrf_exempt
def send_otp(request):
    if request.method == "POST":
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        user = authenticate(username=username, password=password)
        if user is not None:
            email = user.email
            otp = str(random.randint(100000, 999999))
            request.session['otp'] = otp
            request.session['otp_time'] = int(time.time())
            send_mail(
                "Your OTP Code",
                f"Your OTP code is: {otp}",
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return JsonResponse({"success": True, "message": "OTP sent to your registered email."})
        else:
            return JsonResponse({"success": False, "message": "Invalid username or password."})
    return JsonResponse({"success": False, "message": "Invalid request."}, status=400)

@csrf_exempt
def autosave_entry(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            entry_id = data.get("id")  # If row already exists
            date = data.get("date")
            vehicle_driver = data.get("vehicle_driver", "").strip()
            location = data.get("location", "").strip()
            weight_tons = data.get("weight_tons", "").strip()   # ✅ keep as string
            try:
                rate_per_ton = float(data.get("rate_per_ton") or 0)
            except ValueError:
                rate_per_ton = 0
            try:
                amount = float(data.get("amount") or 0)
            except ValueError:
                amount = 0
            deductions = data.get("deductions", "[]")  # JSON string from frontend
            try:
                final_amount = float(data.get("final_amount") or 0)
            except ValueError:
                final_amount = 0

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
            print("Autosave error:", e)  # Add this line for debugging
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