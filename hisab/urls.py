"""
URL configuration for hisab project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from hisab_app import views


urlpatterns = [
    path('admin/', admin.site.urls),
    # path('', views.entry_view, name='entry_form'),
    path("signup/", views.user_signup, name="signup"),
    path('login/', views.user_login, name='login'),
    path("logout/", views.user_logout, name="user_logout"),

    path('send_otp/', views.send_otp, name='send_otp'),


    path('', views.hisab_table_view, name='hisab_table'),
    path('autosave_entry/', views.autosave_entry, name='autosave_entry'),
    path('delete-entry/', views.delete_entry, name='delete_entry'),
]
