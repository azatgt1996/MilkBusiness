const notyf = new Notyf({ position: { x: 'center', y: 'bottom' } })
const { createApp, ref, watch, computed, onMounted } = Vue

window.onerror = window.onunhandledrejection = (err) => {
  notyf.error('Ошибка')
}

const _token = 'Z2hwX2FsYVlYU2dRQ3F1MmVvan' + 'ZLWWlBblBhdlVsT2pPUjNqN3ZhRQ=='
const service = {
  url: 'https://api.github.com/gists/a76d3bb997ac279cc6d96cc7de984d48',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `token ${atob(_token)}`,
  },
  file: 'milk_business.json',
  async getData() {
    try {
      const res = await fetch(this.url, { method: 'GET', headers: this.headers })
      const { files } = await res.json()
      return JSON.parse(files[this.file].content)
    } catch (error) {
      notyf.error('Ошибка:', error)
    }
  },
  async saveData(content) {
    try {
      const body = { files: { [this.file]: { content: JSON.stringify(content) } } }
      await fetch(this.url, { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) })
    } catch (error) {
      notyf.error('Ошибка:', error)
    }
  },
}

setWidth('#clients-table', [70, 140, 150, 92])
setWidth('#deals-table', [140, 90, 60, 40, 90])
setWidth('#sales-table', [110, 100, 100, 100])
setWidth('#report-table-1', [120, 60, 80])
setWidth('#report-table-2', [140, 60, 80])

createApp({
  setup() {
    const store = ref({ clients: [], deals: [] })
    const currentPage = ref(ls.get('currentPage') ?? 'auth')
    const loading = ref(true)

    watch(currentPage, (val) => ls.set('currentPage', currentPage.value))

    onMounted(async () => {
      store.value = await service.getData()
      loading.value = false
    })

    async function saveStore() {
      loading.value = true
      await service.saveData(store.value)
      loading.value = false
    }

    // AUTH
    const auth = ref({ login: '', password: '' })
    const currentUser = ref(ls.get('currentUser') ?? '')

    async function enter() {
      const { login, password } = auth.value
      const passwordHash = await fastHash(password)
      if (login === 'admin') {
        if (passwordHash !== 'avcrry') return notyf.error('Неверный пароль')
        currentPage.value = 'deals'
      } else {
        const client = store.value.clients.find((it) => it.login === login)
        if (!client) return notyf.error('Пользователь не найден')
        if (client.passwordHash !== passwordHash) return notyf.error('Неверный пароль')
        currentPage.value = 'sales'
      }
      currentUser.value = login
      ls.set('currentUser', currentUser.value)
    }

    function exit() {
      currentPage.value = 'auth'
      ls.set('currentUser', currentUser.value)
      auth.value = { login: '', password: '' }
    }

    // CLIENTS
    const _client = { login: '', password: '', fio: '', address: '', phone: '' }
    const client = ref($clone(_client))

    async function saveClient() {
      const { login, password, fio, address, phone } = client.value
      if (login === 'admin' || store.value.clients.find((it) => it.login === login)) {
        return notyf.error('Клиент с таким логином уже есть')
      }
      if (store.value.clients.find((it) => it.fio === fio)) {
        return notyf.error('Клиент с таким ФИО уже есть')
      }
      const passwordHash = fastHash(password)
      store.value.clients.push({ login, passwordHash, fio, address, phone })
      await saveStore()
      notyf.success('Клиент добавлен')
      client.value = $clone(_client)
      currentPage.value = 'clients'
    }

    // DEALS
    const _deal = {
      fio: '',
      date: today,
      volume: null,
      price: null,
      proteins: undefined,
      fats: undefined,
    }

    const deal = ref($clone(_deal))
    const dealIndex = ref(null)
    const dateFilter = ref(null)

    const filteredDeals = computed(() => {
      if (!dateFilter.value) return store.value.deals
      return store.value.deals.filter((it) => it.date === dateFilter.value)
    })

    const sales = computed(() => {
      if (currentUser.value === 'admin') return []
      const client = store.value.clients.find((it) => it.login === currentUser.value)
      return store.value.deals.filter((it) => it.fio === client.fio)
    })

    const sortedClients = computed(() => {
      return store.value.clients.map((it) => it.fio).toSorted()
    })

    function openDeal(index = null) {
      dealIndex.value = index
      deal.value = $clone(index !== null ? store.value.deals[index] : _deal)
      currentPage.value = 'dealCard'
    }

    async function saveDeal() {
      const { fio, date, volume, price, proteins, fats } = deal.value
      const data = {
        fio,
        date,
        volume,
        price,
        proteins: proteins || undefined,
        fats: fats || undefined,
      }
      if (dealIndex.value !== null) {
        store.value.deals[dealIndex.value] = data
      } else {
        store.value.deals.push(data)
      }
      await saveStore()
      notyf.success(dealIndex.value !== null ? 'Сделка изменена' : 'Сделка добавлена')
      currentPage.value = 'deals'
    }

    // REPORT
    const period = ref('all')

    const periods = computed(() => {
      const arr = currentUser.value === 'admin' ? store.value.deals : sales.value
      const { min, max } = getMinMaxDates(arr)
      return getTwoWeekPeriods(min, max)
    })

    const reportData = computed(() => {
      const arr = currentUser.value === 'admin' ? store.value.deals : sales.value

      if (period.value === 'all') {
        return periods.value.map((period) => {
          const [start, end] = period.value
          const rows = arr.filter((it) => it.date >= start && it.date <= end)
          const volume = rows.reduce((sum, it) => sum + it.volume, 0)
          const sum = rows.reduce((sum, it) => sum + it.volume * it.price, 0)
          return { period: period.label, volume, sum }
        })
      } else {
        const [start, end] = period.value
        const rows = arr.filter((it) => it.date >= start && it.date <= end)
        const result = []
        for (const row of rows) {
          const existing = result.find((it) => it.fio === row.fio)
          if (existing) {
            existing.volume += row.volume
            existing.sum += row.volume * row.price
          } else {
            result.push({ fio: row.fio, volume: row.volume, sum: row.volume * row.price })
          }
        }
        return result
      }
    })

    function gotoReport() {
      currentPage.value = 'report'
      period.value = 'all'
    }

    function backFromReport() {
      currentPage.value = currentUser.value === 'admin' ? 'deals' : 'sales'
    }

    return {
      currentPage,
      currentUser,
      store,
      loading,
      auth,
      enter,
      exit,
      sales,
      period,
      periods,
      reportData,
      gotoReport,
      backFromReport,
      client,
      saveClient,
      deal,
      dealIndex,
      dateFilter,
      filteredDeals,
      sortedClients,
      today,
      saveDeal,
      openDeal,
      formatDate,
    }
  },
}).mount('#app')
