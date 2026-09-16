const getLocalDateStr = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const d1 = new Date("2026-08-23T00:00:00.000Z"); // From API
console.log("From API UTC to Local:", d1);
const y = d1.getFullYear();
const m = String(d1.getMonth() + 1).padStart(2, '0');
const day = String(d1.getDate()).padStart(2, '0');
const h = String(d1.getHours()).padStart(2, '0');
const min = String(d1.getMinutes()).padStart(2, '0');
const dateVal = `${y}-${m}-${day} ${h}:${min}`;
console.log("date.value:", dateVal);

// simulated backend
const backendDate = new Date(dateVal);
console.log("Backend parses:", backendDate);
console.log("Backend saves to DB:", backendDate.toISOString());

