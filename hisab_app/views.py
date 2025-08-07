from django.shortcuts import render
from .forms import EntryForm
# Create your views here.



def entry_view(request):
    form = EntryForm()
    return render(request, 'entry_form.html', {'form': form})


def hisab_table_view(request):
    return render(request, 'hisab_table.html')
