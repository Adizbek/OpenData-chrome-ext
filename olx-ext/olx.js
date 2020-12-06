/**
 * @param {Object} obj1
 * @param {Object} obj2
 * @return {boolean}
 */
function isObjDiff (obj1, obj2) {
  if (!obj1 || !obj2) {
    return false
  }

  let obj1Keys = Object.keys(obj1)
  let obj2Keys = Object.keys(obj2)

  let theSameKeys = obj1Keys.every(x => obj2Keys.findIndex(y => x === y) >= 0)

  if (!theSameKeys) {
    return true
  }

  // the same values
  return obj1Keys.some(key => obj1[key] !== obj2[key])
}

/**
 * @param price
 * @return {string}
 */
let toPrice = (price) => new Intl.NumberFormat('ru-RU').format(price)

let priceLabel = document.querySelector('.offer-titlebox__price')
let isAutoPage = document.querySelectorAll('#offerdescription a[href*=\'legkovye-avtomobili\']').length > 4
if (priceLabel && isAutoPage) {
  let url = (location.protocol + '//' + location.hostname + location.pathname).replace('/oz/', '')

  $.get('https://api.expert.uz/vehicle/buyer/recommendations_by_url/?url=' + url, function ({ prices, similar_ads }) {
    let promotion = document.createElement('div')
    console.log({ prices, similar_ads })

    if (similar_ads.length <= 1) {
      promotion.innerHTML = `<b>Ushbu transport parametrlariga mos boshqa takliflar topa olmadin! <a target="_blank" style="text-decoration: underline" href="https://expert.uz">Expert.uz</a><b/>`
    } else {
      let hasMore = similar_ads.length > 5
      let items = similar_ads.filter((x, i) => i < 5).map(ad => {
        return `<a href="${ad.url}">${ad.title}, \$${toPrice(ad.price_usd)}, ${toPrice(ad.price_uzs)} so'm</a>`
      }).join('<br>')

      // language=HTML
      promotion.innerHTML = `
        <div style="line-height: 24px">
          <h3 style="font-weight: bold; margin-bottom: .3rem; margin-top: .6rem;">
            <a href="https://expert.uz">Expert.uz</a> tomonidan narxlar analizi 
          </h3> 
          
          <div>Min: \$${toPrice(prices.min_price_usd)}, ${toPrice(prices.min_price_uzs)} so'm</div>
          <div>Maks: \$${toPrice(prices.max_price_usd)}, ${toPrice(prices.max_price_uzs)} so'm</div>
          <div>O'rtacha: \$${toPrice(prices.avg_price_usd)}, ${toPrice(prices.avg_price_uzs)} so'm</div>
          
          <h3 style="font-weight: bold; margin-bottom: .3rem; margin-top: .6rem;">
            <a href="https://expert.uz">Expert.uz</a> tomonidan ko'rsatilayotgan takliflar
          </h3> 

          ${items}
          
          <div>
            ${hasMore && `<a href="https://export.uz/similar=${url}"><div style="padding: 4px 8px; margin-top: 12px" class="button">Yana boshqa takliflarni Expert.uz saytida ko'ring</div><a/>`}
          </div>
        </div>
      `
    }

    // promotion.className = 'promotion inverted'
    promotion.style.paddingTop = '10px'
    promotion.style.fontSize = '20px'

    priceLabel.parentElement.insertBefore(promotion, priceLabel.nextSibling)
  })
}

const maybeAppendSlash = function (url) {
  if (url[url.length - 1] !== '/') {
    url += '/'
  }
  return url
}

const ensureTrailingSlash = function (url) {
  const parser = document.createElement('a')
  parser.href = url
  parser.pathname = maybeAppendSlash(parser.pathname)
  return parser.href
}

$.ajaxSetup({
  beforeSend: function (xhr, settings) {
    settings.url = ensureTrailingSlash(settings.url)
  }
})

if (location.href.includes('/post-new-ad')) {
  let form = document.querySelector('form#newOffer')

  let dataObserver = {
    brand: () => {
      let cat = form.elements[`data[category_id]`].value

      if (cat) {
        let breadcrumbs = form.querySelector('#catgory-breadcrumb-text')

        let main = breadcrumbs.children[2].innerText

        if (main.includes('Легковые автомобили') || main.includes('Yengil avtomobillar')) {
          return breadcrumbs.children[4].innerText
        }
      }

      return null
    },

    model: () => {
      /** @type {HTMLSelectElement} */
      let target = document.querySelector('*[name="data[param_model]"]')

      return target && target.selectedOptions[0].innerText
    },

    transmission: () => {
      /** @type {HTMLSelectElement} */
      let target = document.querySelector('*[name="data[param_transmission_type]"]')

      return {
        '545': 'manual',
        '546': 'automatic',
        '547': 'other'
      }[target && target.value]
    },

    condition: () => {
      /** @type {HTMLSelectElement} */
      let target = document.querySelector('*[name="data[param_condition]"]')

      return target && target.value
    },

    year: () => {
      /** @type {HTMLInputElement} */
      let target = document.querySelector('input[name="data[param_motor_year]"]')

      return target && target.value
    },

    millage: () => {
      /** @type {HTMLInputElement} */
      let target = document.querySelector('input[name="data[param_motor_mileage]"]')

      return target && target.value
    }
  }

  let oldFormData = {}

  function check () {
    let formData = Object.keys(dataObserver).reduce((aggr, key) => {
      aggr[key] = dataObserver[key]()
      return aggr
    }, {})

    if (isObjDiff(formData, oldFormData)) {
      console.log(formData)
      oldFormData = formData

      if (formData.model) {
        jQuery.get('https://api.expert.uz/vehicle/buyer/recommendations_by_parameters/', {
          model_name: formData.model,
          manufactured_year: formData.year || undefined,
          driven_km: formData.millage || undefined,
          condition: formData.condition || undefined,
          transmission_type: formData.transmission || undefined
        }, (res) => {
          console.log(res)
          let { prices, similar_ads_total } = res

          let old = document.getElementById('expert-promotion')
          if (old || similar_ads_total === 0) {
            document.body.removeChild(old)
          }

          let option = document.createElement('div')
          option.id = 'expert-promotion'
          option.style.position = 'fixed'
          option.style.background = 'white'
          option.style.top = '16px'
          option.style.right = '16px'
          option.style.border = '1px solid #ddd'
          option.style.borderRadius = '4px'
          option.style.padding = '12px'
          option.style.zIndex = '1000'
          option.style.textAlign = 'left'
          option.style.lineHeight = '22px'

          option.innerHTML = `
            <h3 style="font-size: 24px; margin-bottom: .5rem; font-weight: bold;">
              <a href="https://expert.uz" target="_blank">Expert.uz</a> tavsiya qilayotgan narxlar
            </h3>
            
            <div style="font-size: 28px">
               \$${toPrice(prices.avg_price_usd).bold()} | ${toPrice(prices.avg_price_uzs).bold()} so'm
            </div>
            
            <br>
            
            <div>
              <div>Min: \$${toPrice(prices.min_price_usd).bold()}</div>
              <div>Maks: \$${toPrice(prices.max_price_usd).bold()}</div>
              <div>O'rtacha: \$${toPrice(prices.avg_price_usd).bold()}</div>
            </div> 
            
            <br>
            
            <div>
              <div>Min: ${toPrice(prices.min_price_uzs).bold()} so'm</div>
              <div>Maks: ${toPrice(prices.max_price_uzs).bold()} so'm</div>
              <div>O'rtacha: ${toPrice(prices.avg_price_uzs).bold()} so'm</div>
            </div> 
            
            <br>
            <div>Narxlar <b>${similar_ads_total}</b> ta e'lon asosida taklif qilindi</div> 
          `

          document.body.appendChild(option)
        })
      }
    }
  }

  if (form) {
    setInterval(check, 100)
  }
}

