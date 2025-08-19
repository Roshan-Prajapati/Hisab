from django.db import models

# Create your models here.
class TransportEntry(models.Model):
    date = models.DateField(null=True, blank=True)
    vehicle_driver = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    weight_tons = models.CharField(max_length=50, blank=True)  # keeping as string because of fraction format like 12/34
    rate_per_ton = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    deductions = models.TextField(blank=True)  # store JSON or string
    final_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.date} - {self.vehicle_driver}"