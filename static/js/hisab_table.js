/* ---------------- Filter Section ---------------- */
function applyFilters() {
    const dateVal = document.getElementById("filter-date").value;
    const vehicleVal = document.getElementById("filter-vehicle").value.trim().toLowerCase();
    const locationVal = document.getElementById("filter-location").value.trim().toLowerCase();

    const rows = Array.from(document.querySelectorAll("#hisab-table-body tr"));

    // Filter rows
    rows.forEach(row => {
        const dateInput = row.querySelector('input[type="date"]');
        const vehicleInput = row.querySelector('.truck_number');
        const locationInput = row.querySelector('.location');

        let show = true;

        if (dateVal && dateInput && dateInput.value !== dateVal) show = false;
        if (vehicleVal && vehicleInput && !vehicleInput.value.toLowerCase().includes(vehicleVal)) show = false;
        if (locationVal && locationInput && !locationInput.value.toLowerCase().includes(locationVal)) show = false;

        row.style.display = show ? "" : "none";
    });

    // Sort visible rows by date descending
    const visibleRows = rows.filter(row => row.style.display !== "none");
    visibleRows.sort((a, b) => {
        const dateA = a.querySelector('input[type="date"]')?.value || "";
        const dateB = b.querySelector('input[type="date"]')?.value || "";
        // Empty dates go last
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        // Compare as YYYY-MM-DD strings (descending)
        return dateA < dateB ? 1 : dateA > dateB ? -1 : 0;
    });

    // Re-append sorted visible rows at the top of tbody
    const tbody = document.getElementById("hisab-table-body");
    visibleRows.forEach(row => tbody.appendChild(row));
}

function clearFilters() {
    document.getElementById("filter-date").value = "";
    document.getElementById("filter-vehicle").value = "";
    document.getElementById("filter-location").value = "";
    applyFilters();
}

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
    const tableBody = document.getElementById("hisab-table-body");
    let newRow;

    if (tableBody.rows.length > 0) {
        // Clone the first row if it exists
        const firstRow = tableBody.rows[0];
        newRow = firstRow.cloneNode(true);
        // Clear all input values in the new row
        newRow.querySelectorAll("input").forEach(input => {
            if (input.type === "hidden") {
                input.value = "[]";
            } else {
                input.value = "";
            }
        });
        // Clear deduction chips
        const deductionContainer = newRow.querySelector(".deduction-container");
        if (deductionContainer) deductionContainer.innerHTML = "";
        newRow.removeAttribute("data-id");
    } else {
        // Create a new row from scratch if table is empty
        newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td><input type="date" value="" /></td>
            <td><input type="text" class="truck_number" value="" /></td>
            <td><input type="text" class="location" value="" /></td>
            <td><input type="text" class="weight" value="" oninput="updateWeightDisplay(this)" /></td>
            <td><input type="number" class="rate" value="" oninput="updateAmount(this)" /></td>
            <td><input type="number" class="amount" value="" readonly /></td>
            <td>
                <div class="deduction-wrapper">
                    <div class="deduction-input-group">
                        <input type="text" class="deduction-input" onkeydown="handleDeductionKey(event)" placeholder="Enter" />
                        <button class="toggle-btn" onclick="toggleDeductionList(this)">&#9662;</button>
                    </div>
                    <div class="deduction-container"></div>
                    <input type="hidden" class="deduction-hidden" value="[]" />
                </div>
            </td>
            <td><input type="number" class="final" value="" readonly /></td>
            <td><button class="delete-row-btn" onclick="deleteRow(this)">X</button></td>
        `;
    }

    // Insert the new row at the top
    tableBody.insertBefore(newRow, tableBody.firstChild);

    // Attach your existing listeners to the new row
    if (typeof attachInputListeners === "function") {
        attachInputListeners(newRow);
    }
    if (typeof autoSave === "function") {
        autoSave(newRow);
    }
}

function deleteRow(button) {
    const row = button.closest("tr");
    const entryId = row.getAttribute("data-id");

    // Show custom confirmation popup
    showConfirmPopup("Are you sure you want to delete this entry?", function () {
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
    });
}


function showConfirmPopup(message, onConfirm) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";

    // Create popup box
    const popup = document.createElement("div");
    popup.className = "popup-box";

    // Message
    const msg = document.createElement("p");
    msg.textContent = message;

    // Buttons
    const btnYes = document.createElement("button");
    btnYes.textContent = "Yes";
    btnYes.className = "btn-yes";
    btnYes.onclick = () => {
        document.body.removeChild(overlay);
        onConfirm(); // Run delete
    };

    const btnNo = document.createElement("button");
    btnNo.textContent = "No";
    btnNo.className = "btn-no";
    btnNo.onclick = () => {
        document.body.removeChild(overlay);
    };

    // Append
    popup.appendChild(msg);
    popup.appendChild(btnYes);
    popup.appendChild(btnNo);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
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
    document.querySelectorAll("#hisab-table-body tr").forEach(row => {
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