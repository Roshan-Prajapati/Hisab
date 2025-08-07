from django import forms


class EntryForm(forms.Form):
    date = forms.DateField(widget=forms.DateInput(attrs={
        'type': 'date',
        'class': 'form-control'
    }))
    vehicle_no_or_driver = forms.CharField(label="Vehicle No/Driver", widget=forms.TextInput(attrs={
        'placeholder': 'Enter Vehicle No or Driver Name',
        'class': 'form-control'
    }))
    
    location = forms.CharField(widget=forms.TextInput(attrs={
        'placeholder': 'Enter Location',
        'class': 'form-control'
    }))
    weight = forms.DecimalField(max_digits=10, decimal_places=2, widget=forms.NumberInput(attrs={
        'placeholder': 'Weight in tons',
        'class': 'form-control'
    }))
    amount = forms.DecimalField(max_digits=10, decimal_places=2, widget=forms.NumberInput(attrs={
        'placeholder': 'Total Amount',
        'class': 'form-control'
    }))
    deductions = forms.DecimalField(max_digits=10, decimal_places=2, required=False, widget=forms.NumberInput(attrs={
        'placeholder': 'Any Deductions',
        'class': 'form-control'
    }))

