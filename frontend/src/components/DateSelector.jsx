const DAYS = 8; // Today + next 7 days

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function getDateOptions() {
  const options = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    options.push({
      value: formatDate(d),
      label: i === 0 ? 'Today' : `+${i} day${i > 1 ? 's' : ''}`,
      date: d,
    });
  }
  return options;
}

export default function DateSelector({ selectedDate, onDateChange }) {
  const options = getDateOptions();

  return (
    <div className="date-selector">
      <label htmlFor="date-select">Match date</label>
      <select
        id="date-select"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} ({opt.value})
          </option>
        ))}
      </select>
    </div>
  );
}
