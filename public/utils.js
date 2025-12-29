function formatDate(date) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' }
  return new Date(date).toLocaleDateString(navigator.language, options)
}

function toIsoDate(date) {
  const d = new Date(date)
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((it) => it.toString().padStart(2, '0')).join('-')
}

function getTwoWeekPeriods(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const periods = []
  let currentStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() > 15 ? 16 : 1)

  while (currentStart <= end) {
    const year = currentStart.getFullYear()
    const month = currentStart.getMonth()

    let periodEnd
    if (currentStart.getDate() === 1) {
      periodEnd = new Date(year, month, 15)
    } else {
      const nextMonth = new Date(year, month + 1, 0)
      periodEnd = new Date(year, month, nextMonth.getDate())
    }
    periods.push({
      label: `${formatDate(currentStart)} - ${formatDate(periodEnd)}`,
      value: [toIsoDate(currentStart), toIsoDate(periodEnd)],
    })
    currentStart = currentStart.getDate() === 1 ? new Date(year, month, 16) : new Date(year, month + 1, 1)
  }
  return periods
}

function getMinMaxDates(arr) {
  const dates = arr.map((it) => it.date)
  const min = dates.sort()[0]
  const max = dates.sort().reverse()[0]
  return { min, max }
}

function fastHash(data) {
  const str = JSON.stringify(data)
  const seed = 0x811c9dc5
  let hash = seed
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 0x01000193)
    hash >>>= 0
  }
  return (hash >>> 0).toString(36)
}

function $clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function setWidth(table, widths) {
  const style = document.createElement('style')
  widths.forEach((width, i) => {
    const w = `${width}px`
    style.textContent += `${table} td:nth-child(${i + 1}), ${table} th:nth-child(${i + 1})
            { min-width: ${w}; max-width: ${w}; }`
  })
  document.head.appendChild(style)
}

const ls = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
}

const today = new Date().toISOString().slice(0, 10)
