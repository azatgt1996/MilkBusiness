const { createApp, ref, watch, computed, onMounted } = Vue

const notyf = new Notyf({ position: { x: 'center', y: 'bottom' } })
window.onerror = window.onunhandledrejection = () => notyf.error('Ошибка')

const service = {
  url: 'https://api.github.com/gists/a76d3bb997ac279cc6d96cc7de984d48',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `token ${atob('Z2hwX2FsYVlYU2dRQ3F1MmVvan' + 'ZLWWlBblBhdlVsT2pPUjNqN3ZhRQ==')}`,
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

setTablesWidth({
  '#clients-table': [70, 140, 150, 92],
  '#deals-table': [140, 90, 60, 40, 90],
  '#sales-table': [90, 60, 40, 90],
  '#report-table-1': [140, 60, 80],
  '#report-table-2': [140, 60, 80],
})

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
      const passwordHash = await hashSHA256(password)
      if (login === 'admin') {
        if (passwordHash !== 'c9f85cea19943cf562972b68578c72899bdb4999baad0aa3ee1d729b8167fabf') {
          return notyf.error('Неверный пароль')
        }
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

    function showTel() {
      const support = '+79001112233'
      const message = /*html*/ `<div class="recall-info">Позвоните пожалуйста по номеру <a href="tel:${support}">${support}</a></div>`
      notyf.open({ message })
    }

    // CLIENTS
    const _client = { id: null, login: '', password: '', fio: '', address: '', phone: '', comment: '' }
    const client = ref($clone(_client))
    const sortedClients = computed(() => store.value.clients.toSorted(azSort('fio')))

    function openClient(id = null) {
      if (id) {
        const openedClient = store.value.clients.find((it) => it.id === id)
        client.value = $clone(openedClient)
      } else {
        client.value = $clone(_client)
      }
      currentPage.value = 'clientCard'
    }

    async function saveClient() {
      const { id, login, password, passwordHash, fio, address, phone, comment } = client.value
      if (login === 'admin' || store.value.clients.find((it) => it.login === login && it.id !== id)) {
        return notyf.error('Клиент с таким логином уже есть')
      }
      if (store.value.clients.find((it) => it.fio === fio && it.id !== id)) {
        return notyf.error('Клиент с таким ФИО уже есть')
      }
      const hash = await hashSHA256(password)
      const data = { id: id || nanoid(5), fio, login, address, phone, comment }
      data.passwordHash = id && !password ? passwordHash : hash
      if (id) {
        const index = store.value.clients.findIndex((it) => it.id === id)
        store.value.clients[index] = data
      } else {
        store.value.clients.push(data)
      }
      await saveStore()
      notyf.success(id ? 'Клиент изменен' : 'Клиент добавлен')
      currentPage.value = 'clients'
    }

    // DEALS
    const _deal = { id: null, fio: '', date: today, volume: null, price: null, proteins: undefined, fats: undefined }

    const deal = ref($clone(_deal))
    const dateFilter = ref(null)
    const getProteinsFatsInfo = (it) => (it.proteins || it.fats ? `(${it.proteins || '-'} / ${it.fats || '-'})` : '')

    const filteredDeals = computed(() => {
      if (!dateFilter.value) return store.value.deals.toSorted(zaSort('date'))
      return store.value.deals.filter((it) => it.date === dateFilter.value)
    })

    const sales = computed(() => {
      if (currentUser.value === 'admin') return []
      const client = store.value.clients.find((it) => it.login === currentUser.value)
      return store.value.deals.filter((it) => it.fio === client.fio).toSorted(zaSort('date'))
    })

    function openDeal(id = null) {
      if (id) {
        const openedDeal = store.value.deals.find((it) => it.id === id)
        deal.value = $clone(openedDeal)
      } else {
        deal.value = $clone(_deal)
      }
      currentPage.value = 'dealCard'
    }

    async function saveDeal() {
      const { id, fio, date, volume, price, proteins, fats } = deal.value
      const data = {
        id: id || nanoid(5),
        fio,
        date,
        volume,
        price,
        proteins: proteins || undefined,
        fats: fats || undefined,
      }
      if (id) {
        const index = store.value.deals.findIndex((it) => it.id === id)
        store.value.deals[index] = data
      } else {
        store.value.deals.push(data)
      }
      await saveStore()
      notyf.success(id ? 'Сделка изменена' : 'Сделка добавлена')
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
        return result.toSorted(azSort('fio'))
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
      today,
      formatDate,

      store,
      currentPage,
      loading,

      auth,
      currentUser,
      enter,
      exit,
      showTel,

      client,
      sortedClients,
      openClient,
      saveClient,

      deal,
      dateFilter,
      filteredDeals,
      sales,
      getProteinsFatsInfo,
      openDeal,
      saveDeal,

      period,
      periods,
      reportData,
      gotoReport,
      backFromReport,
    }
  },
}).mount('#app')
