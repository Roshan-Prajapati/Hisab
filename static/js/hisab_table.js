/* ---------------- Amount Calculation ---------------- */
function updateAmount(input) {
    const row = input.closest("tr");
    let weightRaw = row.querySelector(".weight").value || "";

    // keep original value (e.g. "12/34") but calculate only on first part
    let weightPart = weightRaw.includes("/") 
        ? weightRaw.split("/")[0].trim() 
        : weightRaw.trim();
    let weight = parseFloat(weightPart) || 0;

    const rate = parseFloat(row.querySelector(".rate").value) || 0;
    const amount = weight * rate;
    row.querySelector(".amount").value = amount.toFixed(2);

    updateFinal(row);
    autoSave(row);
}

function updateWeightDisplay(input) {
    updateAmount(input);
}

/* ---------------- Final Amount ---------------- */
function updateFinal(row) {
    const amount = parseFloat(row.querySelector(".amount").value) || 0;
    let totalDeductions = 0;

    row.querySelectorAll(".deduction-chip").forEach(chip => {
        const value = chip.getAttribute("data-value");
        const match = value.match(/=\s*(\d+(\.\d+)?)/);
        if (match) totalDeductions += parseFloat(match[1]) || 0;
    });

    const final = amount - totalDeductions;
    row.querySelector(".final").value = final.toFixed(2);
}

/* ---------------- Deductions ---------------- */
function handleDeductionKey(event) {
    const input = event.target;
    const wrapper = input.closest(".deduction-wrapper");
    const container = wrapper.querySelector(".deduction-container");

    if (event.key === "Enter" && input.value.trim() !== "") {
        event.preventDefault();
        const text = input.value.trim().toUpperCase();
        const match = text.match(/^.+=\s*(\d+(\.\d+)?)$/);
        if (!match) {
            alert("Please enter in format: LABEL ANYTEXT = NUMBER (e.g., SORTAGE 100KG = 1200)");
            return;
        }

        const exists = [...container.querySelectorAll('.deduction-chip')]
            .some(chip => chip.getAttribute("data-value") === text);

        if (!exists) {
            input.value = "";
            addDeductionChip(container, text);
            container.style.display = "block";
        }
    }
}

function addDeductionChip(container, text) {
    const chip = document.createElement("div");
    chip.className = "deduction-chip";
    chip.setAttribute("data-value", text);

    const span = document.createElement("span");
    span.textContent = text;
    span.style.cursor = "pointer";
    span.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = span.textContent;
        input.style.width = "100%";
        input.style.fontSize = "14px";
        input.style.textTransform = "uppercase";
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                updateChipValue(chip, input.value);
            }
        });
        input.addEventListener("blur", () => {
            updateChipValue(chip, input.value);
        });
        chip.replaceChild(input, span);
        input.focus();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-deduction-btn";
    deleteBtn.innerHTML = "❌";
    deleteBtn.onclick = () => {
        chip.remove();
        updateFinal(container.closest("tr"));
        autoSave(container.closest("tr"));
        syncHidden(container);
    };

    chip.appendChild(span);
    chip.appendChild(deleteBtn);
    container.appendChild(chip);

    updateFinal(container.closest("tr"));
    syncHidden(container);
    autoSave(container.closest("tr"));
}

function updateChipValue(chip, newValue) {
    const span = document.createElement("span");
    span.textContent = newValue;
    span.style.cursor = "pointer";
    span.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = span.textContent;
        input.style.width = "100%";
        input.style.fontSize = "14px";
        input.style.textTransform = "uppercase";
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                updateChipValue(chip, input.value);
            }
        });
        input.addEventListener("blur", () => {
            updateChipValue(chip, input.value);
        });
        chip.replaceChild(input, span);
        input.focus();
    });

    chip.dataset.value = newValue;
    chip.replaceChild(span, chip.firstChild);

    const container = chip.closest(".deduction-container");
    syncHidden(container);
    updateFinal(container.closest("tr"));
    autoSave(container.closest("tr"));
}

function toggleDeductionList(button) {
    const container = button.closest(".deduction-wrapper").querySelector(".deduction-container");
    container.style.display = container.style.display === "block" ? "none" : "block";
}

/* ---------------- Row Management ---------------- */
function attachInputListeners(row) {
    row.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", function () {
            autoSave(row);
        });
    });
}

function addRow() {
    const table = document.getElementById("editableTable").querySelector("tbody");
    const firstRow = table.rows[0];
    const newRow = firstRow.cloneNode(true);

    newRow.querySelectorAll("input").forEach(input => input.value = "");
    newRow.querySelector(".deduction-wrapper").innerHTML = `
        <div class="deduction-input-group">
            <input type="text" class="deduction-input" onkeydown="handleDeductionKey(event)" placeholder="Enter" />
            <button class="toggle-btn" onclick="toggleDeductionList(this)">&#9662;</button>
        </div>
        <div class="deduction-container"></div>
        <input type="hidden" class="deduction-hidden" value="[]">
    `;
    newRow.removeAttribute("data-id");

    newRow.querySelector(".delete-row-btn").onclick = function () {
        deleteRow(this);
    };

    table.insertBefore(newRow, table.firstChild);

    attachInputListeners(newRow); // <-- Add this line

    autoSave(newRow);
}

function deleteRow(button) {
    const row = button.closest("tr");
    const entryId = row.getAttribute("data-id");

    if (entryId) {
        fetch("/delete-entry/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({ id: entryId }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                row.remove();
            } else {
                alert("Failed to delete entry.");
            }
        })
        .catch(() => alert("Error deleting entry."));
    } else {
        // If row is not saved yet, just remove from DOM
        row.remove();
    }
}

/* ---------------- AutoSave ---------------- */
function autoSave(row) {
    const entryId = row.dataset.id;

    // ✅ collect deductions from chips
    const deductionsArray = Array.from(
        row.querySelectorAll(".deduction-chip")
    ).map(chip => chip.dataset.value);

    // ✅ also update the hidden input so it stays in sync
    const hiddenInput = row.querySelector(".deduction-hidden");
    if (hiddenInput) {
        hiddenInput.value = JSON.stringify(deductionsArray);
    }

    const data = {
        id: entryId,
        date: row.querySelector('input[type="date"]').value,
        vehicle_driver: row.querySelector(".truck_number")?.value.trim(),
        location: row.querySelector(".location")?.value.trim(),
        weight_tons: row.querySelector(".weight").value || "",   // keep original string
        rate_per_ton: row.querySelector(".rate").value || "",
        amount: row.querySelector(".amount").value || "",
        final_amount: row.querySelector(".final").value || "",
        deductions: JSON.stringify(deductionsArray), // ✅ now properly synced
    };

    fetch("/autosave_entry/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(data),
    })
        .then(res => res.json())
        .then(result => {
            if (result.success && result.id) {
                row.dataset.id = result.id;
            }
        })
        .catch(err => console.error("Autosave error:", err));
}

/* ---------------- Init ---------------- */
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("#editableTable tbody tr").forEach(row => {
        attachInputListeners(row); // <-- Add this line
    });

    document.querySelectorAll(".deduction-hidden").forEach(hidden => {
        let deductions;
        try {
            deductions = JSON.parse(hidden.value);
        } catch (e) {
            deductions = [];
        }

        const wrapper = hidden.closest(".deduction-wrapper");
        const container = wrapper.querySelector(".deduction-container");

        deductions.forEach(text => {
            addDeductionChip(container, text);
        });

        updateFinal(wrapper.closest("tr"));
    });
});

function syncHidden(container) {
    const wrapper = container.closest(".deduction-wrapper");
    const hidden = wrapper.querySelector(".deduction-hidden");
    const chips = Array.from(container.querySelectorAll(".deduction-chip"))
                      .map(chip => chip.dataset.value);
    hidden.value = JSON.stringify(chips);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
