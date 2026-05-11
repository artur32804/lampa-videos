(function () {
  'use strict';

  var PLUGIN_ID = 'uafix';
  var BASE_URL = 'https://uafix.net';
  var DEFAULT_LIMIT = 24;
  var PROXY_URL = '';

  var state = {
    injected: false,
    current: null
  };

  var categories = [
    { title: 'Останні', url: '/films/' },
    { title: 'Фільми', url: '/films/' },
    { title: 'Серіали', url: '/serials/' },
    { title: 'Мультики', url: '/cartoons/' },
    { title: 'Аніме', url: '/anime/' },
    { title: 'Дорами', url: '/dorama/' },
    { title: 'Новинки кіно', url: '/films/new_netflix_ua/' },
    { title: 'Жахи', url: '/films/films_horror/' },
    { title: 'Бойовики', url: '/films/action/' },
    { title: 'Комедії', url: '/films/comedy/' },
    { title: 'Фантастика', url: '/films/fantastics/' },
    { title: 'Документальні', url: '/films/documental_films/' }
  ];

  var filterGroups = [
    {
      key: 'default',
      title: 'Сортування',
      items: [
        { title: 'За замовчуванням', value: '' },
        { title: 'По переглядах', value: 'news_read' },
        { title: 'За рейтингом', value: 'rating' },
        { title: 'За датою додавання', value: 'date' }
      ]
    },
    {
      key: 'starna',
      title: 'Країна',
      items: ['США', 'Велика Британія', 'Іспанія', 'Італія', 'Франція', 'Канада', 'Німеччина', 'Туреччина', 'Індія', 'Корея', 'Китай', 'Японія'].map(function (value) {
        return { title: value, value: value };
      })
    },
    {
      key: 'janr',
      title: 'Жанр',
      items: ['біографія', 'бойовик', 'екшн', 'вестерн', 'детектив', 'документальний', 'драма', 'історія', 'комедія', 'кримінал', 'мелодрама', 'музика', 'мюзикл', 'пригоди', 'сімейний', 'спорт', 'трилер', 'жахи', 'фантастика', 'фентезі'].map(function (value) {
        return { title: value, value: value };
      })
    },
    {
      key: 'god',
      title: 'Рік',
      items: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006', '2005', '2004', '2003', '2002', '2001'].map(function (value) {
        return { title: value, value: value };
      })
    },
    {
      key: 'studia',
      title: 'Студія',
      items: ['Netflix', 'Amazon', 'HBO', 'HBO Max'].map(function (value) {
        return { title: value, value: value };
      })
    },
    {
      key: '-janr',
      title: 'Приховати',
      items: [{ title: 'аніме', value: 'аніме' }]
    }
  ];

  var icon = '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="10" width="48" height="44" rx="8" stroke="currentColor" stroke-width="5"/><path d="M27 23v18l15-9-15-9z" fill="currentColor"/><path d="M18 16h28" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';

  function notify(message) {
    if (window.Lampa && Lampa.Noty) Lampa.Noty.show(message);
    else console.log('[UAFLIX]', message);
  }

  function absolute(url, base) {
    if (!url) return '';
    try {
      return new URL(url, base || BASE_URL).toString();
    } catch (e) {
      return url;
    }
  }

  function clean(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function esc(text) {
    return clean(text).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  function doc(html) {
    return new DOMParser().parseFromString(html || '', 'text/html');
  }

  function requestText(url, options) {
    options = options || {};

    return new Promise(function (resolve, reject) {
      var network = new Lampa.Reguest();
      var targetUrl = options.proxy === false || !PROXY_URL
        ? url
        : PROXY_URL + '?url=' + encodeURIComponent(url) + (options.referer ? '&referer=' + encodeURIComponent(options.referer) : '');

      network.timeout(options.timeout || 15000);
      network.native(
        targetUrl,
        function (response) {
          if (typeof response === 'string') resolve(response);
          else if (response && typeof response.responseText === 'string') resolve(response.responseText);
          else resolve(String(response || ''));
        },
        function (a, c) {
          reject(new Error(network.errorDecode ? network.errorDecode(a, c) : 'Network error'));
        },
        options.postData || false,
        {
          dataType: 'text',
          headers: options.headers && !PROXY_URL ? options.headers : undefined
        }
      );
    });
  }

  function parseCards(html, pageUrl) {
    var root = doc(html);
    var cards = [];

    root.querySelectorAll('.video-item').forEach(function (item) {
      var link = item.querySelector('a.vi-img[href]');
      var image = item.querySelector('img');
      var title = item.querySelector('.vi-title');
      var age = item.querySelector('.age');
      var label = item.querySelector('.mark, .vi-label, .label, .new-ser, .new-item-label');

      if (!link || !image) return;

      cards.push({
        title: clean(title ? title.textContent : image.getAttribute('alt')),
        originalTitle: clean(image.getAttribute('alt')),
        url: absolute(link.getAttribute('href'), pageUrl),
        image: absolute(image.getAttribute('data-src') || image.getAttribute('src'), pageUrl),
        age: clean(age && age.textContent),
        label: clean(label && label.textContent),
        source: PLUGIN_ID
      });
    });

    root.querySelectorAll('a.sres-wrap[href]').forEach(function (item) {
      var image = item.querySelector('img');
      var title = item.querySelector('h2');
      var desc = item.querySelector('.sres-desc');

      if (!image || !title) return;

      cards.push({
        title: clean(title.textContent.split('/')[0]),
        originalTitle: clean(title.textContent),
        url: absolute(item.getAttribute('href'), pageUrl),
        image: absolute(image.getAttribute('data-src') || image.getAttribute('src'), pageUrl),
        description: clean(desc && desc.textContent),
        source: PLUGIN_ID
      });
    });

    return cards;
  }

  function parseListing(html, pageUrl) {
    var root = doc(html);
    var next = root.querySelector('#nav-load a[href], a#nextlink[href], .pnext a[href]');
    var total = root.querySelector('.navigation a:last-child');
    var title = root.querySelector('.sect-title');

    return {
      cards: parseCards(html, pageUrl).slice(0, DEFAULT_LIMIT),
      nextUrl: next ? absolute(next.getAttribute('href'), pageUrl) : '',
      title: clean(title && title.textContent),
      totalPages: total ? clean(total.textContent) : ''
    };
  }

  function parseDetail(html, pageUrl) {
    var root = doc(html);
    var title = clean((root.querySelector('h1') || {}).textContent).replace(/\s+дивитись онлайн$/i, '');
    var originalTitle = clean((root.querySelector('.fsubtitle, h1 + div, h1 + span') || {}).textContent);
    var rating = clean((root.querySelector('.frate, .f-rate, [itemprop="ratingValue"]') || {}).textContent);
    var poster = root.querySelector('.fposter img, .fimg img, .fcols img, img.gogo-online');
    var trailer = root.querySelector('.to-trailer[data-src]');
    var iframe = root.querySelector('#fplayer iframe[src], .fplayer iframe[src], iframe[src*="zetvideo"]');
    var description = clean((root.querySelector('#fdesc, .fdesc, [itemprop="description"]') || {}).textContent);
    var meta = {};

    root.querySelectorAll('.finfo li, .finfo > div, .fmeta li, .full-info li').forEach(function (row) {
      var text = clean(row.textContent);
      var parts = text.split(':');

      if (parts.length > 1) meta[clean(parts.shift())] = clean(parts.join(':'));
      else if (/Рік виходу/i.test(text)) meta.year = text.replace(/Рік виходу:\s*/i, '');
    });

    if (!iframe) {
      var og = root.querySelector('meta[property="og:video:iframe"]');
      var ogValue = og && og.getAttribute('content');
      var match = ogValue && ogValue.match(/src=['"]([^'"]+)/i);

      if (match) iframe = { getAttribute: function () { return match[1]; } };
    }

    return {
      title: title || clean(root.title).replace(/\(.+$/, ''),
      originalTitle: originalTitle,
      rating: rating,
      image: absolute(poster && (poster.getAttribute('data-src') || poster.getAttribute('src')), pageUrl),
      trailer: trailer ? trailer.getAttribute('data-src') : '',
      iframe: iframe ? absolute(iframe.getAttribute('src'), pageUrl) : '',
      description: description,
      meta: meta,
      url: pageUrl,
      source: PLUGIN_ID
    };
  }

  function extractStream(iframeUrl, referer) {
    return requestText(iframeUrl, {
      referer: referer,
      headers: {
        Referer: referer,
        'User-Agent': navigator.userAgent
      }
    }).then(function (html) {
      var file = html.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
        html.match(/file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i) ||
        html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);

      if (!file) throw new Error('Не знайдено пряме посилання на відео');

      return file[1].replace(/\\\//g, '/');
    });
  }

  function injectCss() {
    if (state.injected) return;
    state.injected = true;

    var css = [
      '.uafix-screen{padding:1.5em 2em 3em;color:#fff}',
      '.uafix-head{display:flex;align-items:center;gap:1em;margin-bottom:1.2em;flex-wrap:wrap}',
      '.uafix-title{font-size:2.1em;font-weight:700}',
      '.uafix-status{color:rgba(255,255,255,.62);font-size:1.05em}',
      '.uafix-tabs{display:flex;gap:.55em;flex-wrap:wrap;margin:0 0 1.2em}',
      '.uafix-tools{display:flex;gap:.55em;flex-wrap:wrap;margin:0 0 1.2em}',
      '.uafix-tab,.uafix-tool,.uafix-more{padding:.55em .9em;border-radius:.35em;background:rgba(255,255,255,.08);font-size:1.05em}',
      '.uafix-tab.active,.uafix-tool.active{background:rgba(255,106,0,.28);color:#fff}',
      '.uafix-tab.focus,.uafix-tool.focus,.uafix-card.focus,.uafix-button.focus,.uafix-more.focus,.uafix-search.focus{outline:.18em solid #ff6a00;background:rgba(255,106,0,.18)}',
      '.uafix-search{width:min(34em,100%);padding:.75em 1em;margin:0 0 1.2em;border-radius:.35em;background:rgba(255,255,255,.10);color:#fff;border:0;font-size:1.1em}',
      '.uafix-active-filter{margin:-.4em 0 1em;color:rgba(255,255,255,.72);font-size:1em}',
      '.uafix-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15em,1fr));gap:1em}',
      '.uafix-card{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:.35em;background:#151515}',
      '.uafix-card img{width:100%;height:100%;object-fit:cover;display:block}',
      '.uafix-card:after{content:"";position:absolute;inset:35% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.92))}',
      '.uafix-card-title{position:absolute;left:.75em;right:.75em;bottom:.7em;z-index:2;font-weight:700;font-size:1.05em;line-height:1.22}',
      '.uafix-card-sub{position:absolute;left:.8em;right:.8em;bottom:3.1em;z-index:2;color:rgba(255,255,255,.72);font-size:.82em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.uafix-badge{position:absolute;z-index:2;right:.6em;top:.55em;background:rgba(0,0,0,.70);padding:.2em .45em;border-radius:.2em;font-weight:700}',
      '.uafix-label{position:absolute;z-index:2;left:.6em;top:.55em;background:#e85f1a;padding:.25em .5em;border-radius:.2em;font-weight:700}',
      '.uafix-empty{padding:2em;color:rgba(255,255,255,.7)}',
      '.uafix-load{display:flex;justify-content:center;padding:1.4em 0 .2em}',
      '.uafix-detail{display:grid;grid-template-columns:minmax(18em,38em) 1fr;gap:2em;padding:1.5em 2em 3em;color:#fff}',
      '.uafix-poster{width:100%;aspect-ratio:16/9;object-fit:cover;background:#111}',
      '.uafix-detail h1{font-size:2em;line-height:1.15;margin:0 0 .2em}',
      '.uafix-original{color:rgba(255,255,255,.62);font-size:1.1em;margin-bottom:1.1em}',
      '.uafix-meta{display:grid;grid-template-columns:max-content 1fr;gap:.55em 1.2em;margin:1em 0;color:rgba(255,255,255,.72)}',
      '.uafix-meta b{color:#fff;font-weight:600}',
      '.uafix-desc{font-size:1.08em;line-height:1.45;margin:1em 0 1.4em}',
      '.uafix-actions{display:flex;gap:.75em;flex-wrap:wrap}',
      '.uafix-button{display:inline-flex;align-items:center;gap:.6em;background:#e94936;padding:.8em 1.2em;border-radius:.25em;font-size:1.18em;font-weight:800;text-transform:uppercase}',
      '.uafix-button.secondary{background:rgba(255,255,255,.12);text-transform:none}',
      '@media(max-width:700px){.uafix-screen,.uafix-detail{padding:1em}.uafix-detail{grid-template-columns:1fr}.uafix-title{font-size:1.6em}}'
    ].join('\n');

    $('<style type="text/css"></style>').text(css).appendTo('head');
  }

  function renderCard(card) {
    return [
      '<div class="uafix-card selector" data-url="', esc(card.url), '">',
      '<img src="', esc(card.image), '" alt="', esc(card.originalTitle || card.title), '">',
      card.label ? '<div class="uafix-label">' + esc(card.label) + '</div>' : '',
      card.age ? '<div class="uafix-badge">' + esc(card.age) + '</div>' : '',
      card.originalTitle && card.originalTitle !== card.title ? '<div class="uafix-card-sub">' + esc(card.originalTitle) + '</div>' : '',
      '<div class="uafix-card-title">', esc(card.title), '</div>',
      '</div>'
    ].join('');
  }

  function openDetail(card) {
    saveRecent(card);

    Lampa.Activity.push({
      component: 'uafix_detail',
      title: card.title,
      card: card
    });
  }

  function saveRecent(card) {
    if (!Lampa.Storage || !card || !card.url) return;

    var list = Lampa.Storage.get('uafix_recent', '[]');

    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch (e) {
        list = [];
      }
    }

    if (!Array.isArray(list)) list = [];

    list = list.filter(function (item) {
      return item && item.url !== card.url;
    });

    list.unshift(card);

    Lampa.Storage.set('uafix_recent', list.slice(0, 30));
  }

  function youtubeWatchUrl(url) {
    var match = (url || '').match(/\/embed\/([A-Za-z0-9_-]+)/);
    return match ? 'https://www.youtube.com/watch?v=' + match[1] : url;
  }

  function Dashboard(object) {
    var self = this;

    this.object = object || {};
    this.network = new Lampa.Reguest();
    this.scroll = new Lampa.Scroll({ mask: true, over: true });
    this.category = categories[0];
    this.cards = [];
    this.filter = null;
    this.nextUrl = '';
    this.mode = 'category';
    this.searchQuery = '';
    this.start = function () {
      if (self.activity) self.activity.toggle();
    };
  }

  Dashboard.prototype.create = function () {
    var self = this;

    injectCss();

    this.html = $('<div class="uafix-screen"><div class="uafix-head"><div class="uafix-title">UAFLIX</div><div class="uafix-status"></div></div><div class="uafix-tabs"></div><div class="uafix-tools"></div><input class="uafix-search selector" placeholder="Пошук українською або оригінальною назвою"><div class="uafix-active-filter"></div><div class="uafix-grid"></div><div class="uafix-load"></div></div>');
    this.tabs = this.html.find('.uafix-tabs');
    this.tools = this.html.find('.uafix-tools');
    this.grid = this.html.find('.uafix-grid');
    this.search = this.html.find('.uafix-search');
    this.status = this.html.find('.uafix-status');
    this.activeFilter = this.html.find('.uafix-active-filter');
    this.load = this.html.find('.uafix-load');

    categories.forEach(function (category, index) {
      var tab = $('<div class="uafix-tab selector" data-index="' + index + '">' + esc(category.title) + '</div>');

      tab.on('hover:enter', function () {
        self.category = categories[index];
        self.filter = null;
        self.mode = 'category';
        self.searchQuery = '';
        self.loadCategory(self.category);
      });

      self.tabs.append(tab);
    });

    filterGroups.forEach(function (group, index) {
      var tool = $('<div class="uafix-tool selector" data-filter="' + index + '">' + esc(group.title) + '</div>');

      tool.on('hover:enter', function () {
        self.openFilter(group);
      });

      self.tools.append(tool);
    });

    var recent = $('<div class="uafix-tool selector" data-action="recent">Нещодавно</div>');
    var reset = $('<div class="uafix-tool selector" data-action="reset">Скинути</div>');

    recent.on('hover:enter', function () {
      self.showRecent();
    });

    reset.on('hover:enter', function () {
      self.filter = null;
      self.searchQuery = '';
      self.loadCategory(self.category);
    });

    this.tools.append(recent).append(reset);

    this.search.on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        self.loadSearch(self.search.val());
      }
    }).on('hover:enter', function () {
      this.focus();
    });

    this.loadCategory(this.category);
    this.activity.loader(false);
  };

  Dashboard.prototype.start = function () {
    this.activity.toggle();
  };

  Dashboard.prototype.bindCards = function () {
    var self = this;

    this.html.find('.uafix-card').on('hover:enter', function () {
      var url = $(this).data('url');
      var card = self.cards.filter(function (item) { return item.url === url; })[0];

      if (card) openDetail(card);
    }).on('hover:focus', function () {
      var image = $(this).find('img').attr('src');
      if (Lampa.Background && image) Lampa.Background.change(image);
    });

    this.html.find('.uafix-more').off('hover:enter').on('hover:enter', function () {
      self.loadNext();
    });

    Lampa.Controller.collectionSet(this.html);
    Lampa.Controller.collectionFocus(this.html.find('.selector').first(), this.html);
  };

  Dashboard.prototype.setCards = function (cards, append) {
    this.cards = append ? this.cards.concat(cards || []) : cards || [];
    this.grid.html(this.cards.length ? this.cards.map(renderCard).join('') : '<div class="uafix-empty">Нічого не знайдено</div>');
    this.load.html(this.nextUrl && this.mode === 'category' ? '<div class="uafix-more selector">Завантажити ще</div>' : '');
    this.updateState();
    this.bindCards();
  };

  Dashboard.prototype.updateState = function () {
    var self = this;

    this.tabs.find('.uafix-tab').each(function () {
      $(this).toggleClass('active', categories[$(this).data('index')] === self.category && self.mode === 'category');
    });

    this.tools.find('.uafix-tool').removeClass('active');

    if (this.filter) {
      this.tools.find('[data-filter]').each(function () {
        var group = filterGroups[$(this).data('filter')];
        $(this).toggleClass('active', group && group.key === self.filter.key);
      });

      this.activeFilter.text('Фільтр: ' + this.filter.title + ' - ' + this.filter.valueTitle);
    }
    else if (this.mode === 'recent') {
      this.tools.find('[data-action="recent"]').addClass('active');
      this.activeFilter.text('Локальна історія відкритих карток');
    }
    else if (this.mode === 'search') {
      this.activeFilter.text('Пошук: ' + this.searchQuery);
    }
    else {
      this.activeFilter.text('');
    }

    this.status.text(this.cards.length ? ('Показано: ' + this.cards.length + (this.nextUrl && this.mode === 'category' ? ' / є ще' : '')) : '');
  };

  Dashboard.prototype.openFilter = function (group) {
    var self = this;
    var items = [{ title: 'Скинути', reset: true }];

    if (!Lampa.Select || !Lampa.Select.show) {
      notify('Фільтри недоступні у цій версії Lampa');
      return;
    }

    group.items.forEach(function (item) {
      items.push({
        title: item.title,
        value: item.value
      });
    });

    Lampa.Select.show({
      title: group.title,
      items: items,
      onSelect: function (item) {
        if (item.reset || !item.value) self.filter = null;
        else {
          self.filter = {
            key: group.key,
            title: group.title,
            value: item.value,
            valueTitle: item.title
          };
        }

        self.loadCategory(self.category);
      },
      onBack: function () {
        Lampa.Controller.toggle('content');
      }
    });
  };

  Dashboard.prototype.filterPostData = function () {
    if (!this.filter) return false;

    return {
      xf_sort: 'get',
      xf_field: this.filter.key,
      xf_value: this.filter.value
    };
  };

  Dashboard.prototype.loadCategory = function (category, append, customUrl) {
    var self = this;
    var url = absolute(customUrl || category.url);
    var postData = customUrl ? false : this.filterPostData();

    this.mode = 'category';
    this.searchQuery = '';
    this.activity.loader(true);
    if (!append) {
      this.nextUrl = '';
      this.grid.html('<div class="uafix-empty">Завантаження...</div>');
      this.load.empty();
    }

    requestText(url, { postData: postData }).then(function (html) {
      var listing = parseListing(html, url);

      self.nextUrl = postData ? '' : listing.nextUrl;
      self.setCards(listing.cards, append);
    }).catch(function (error) {
      self.grid.html('<div class="uafix-empty">' + esc(error.message) + '</div>');
    }).then(function () {
      self.activity.loader(false);
    }, function () {
      self.activity.loader(false);
    });
  };

  Dashboard.prototype.loadNext = function () {
    if (!this.nextUrl || this.mode !== 'category') return;

    this.load.html('<div class="uafix-empty">Завантаження...</div>');
    this.loadCategory(this.category, true, this.nextUrl);
  };

  Dashboard.prototype.showRecent = function () {
    var list = Lampa.Storage ? Lampa.Storage.get('uafix_recent', '[]') : [];

    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch (e) {
        list = [];
      }
    }

    if (!Array.isArray(list)) list = [];

    this.mode = 'recent';
    this.filter = null;
    this.searchQuery = '';
    this.nextUrl = '';
    this.setCards(list, false);
  };

  Dashboard.prototype.loadSearch = function (query) {
    var self = this;

    query = clean(query);
    if (query.length < 2) {
      notify('Введіть мінімум 2 символи');
      return;
    }

    var url = BASE_URL + '/index.php?do=search&subaction=search&story=' + encodeURIComponent(query);

    this.mode = 'search';
    this.filter = null;
    this.searchQuery = query;
    this.nextUrl = '';
    this.activity.loader(true);
    this.grid.html('<div class="uafix-empty">Пошук...</div>');
    this.load.empty();

    requestText(url).then(function (html) {
      self.setCards(parseCards(html, url).slice(0, DEFAULT_LIMIT));
    }).catch(function (error) {
      self.grid.html('<div class="uafix-empty">' + esc(error.message) + '</div>');
    }).then(function () {
      self.activity.loader(false);
    }, function () {
      self.activity.loader(false);
    });
  };

  Dashboard.prototype.render = function () {
    return this.html;
  };

  Dashboard.prototype.destroy = function () {
    if (this.html) this.html.remove();
  };

  function Detail(object) {
    var self = this;

    this.object = object || {};
    this.start = function () {
      if (self.activity) self.activity.toggle();
    };
  }

  Detail.prototype.create = function () {
    var self = this;
    var card = this.object.card || {};

    injectCss();

    this.html = $('<div class="uafix-detail"><div><img class="uafix-poster" src="' + esc(card.image) + '" alt="' + esc(card.title) + '"></div><div class="uafix-detail-body"><div class="uafix-empty">Завантаження...</div></div></div>');

    requestText(card.url).then(function (html) {
      self.detail = parseDetail(html, card.url);
      self.renderDetail();
    }).catch(function (error) {
      self.html.find('.uafix-detail-body').html('<div class="uafix-empty">' + esc(error.message) + '</div>');
    }).then(function () {
      self.activity.loader(false);
    }, function () {
      self.activity.loader(false);
    });
  };

  Detail.prototype.start = function () {
    this.activity.toggle();
  };

  Detail.prototype.renderDetail = function () {
    var self = this;
    var detail = this.detail;
    var meta = [];

    Object.keys(detail.meta || {}).forEach(function (key) {
      meta.push('<span>' + esc(key) + ':</span><b>' + esc(detail.meta[key]) + '</b>');
    });

    if (detail.rating) meta.unshift('<span>IMDb:</span><b>' + esc(detail.rating) + '</b>');
    if (detail.image) this.html.find('.uafix-poster').attr('src', detail.image);

    this.html.find('.uafix-detail-body').html([
      '<h1>', esc(detail.title), '</h1>',
      detail.originalTitle ? '<div class="uafix-original">' + esc(detail.originalTitle) + '</div>' : '',
      meta.length ? '<div class="uafix-meta">' + meta.join('') + '</div>' : '',
      '<div class="uafix-desc">', esc(detail.description), '</div>',
      '<div class="uafix-actions">',
      '<div class="uafix-button selector" data-action="play">Дивитись онлайн на укр</div>',
      detail.trailer ? '<div class="uafix-button secondary selector" data-action="trailer">Дивитись трейлер</div>' : '',
      '</div>'
    ].join(''));

    this.html.find('[data-action="play"]').on('hover:enter', function () {
      self.play();
    });

    this.html.find('[data-action="trailer"]').on('hover:enter', function () {
      Lampa.Player.play({
        url: youtubeWatchUrl(detail.trailer),
        title: detail.title + ' - трейлер',
        card: {
          title: detail.title,
          original_title: detail.originalTitle,
          img: detail.image,
          source: PLUGIN_ID,
          url: detail.url
        }
      });
    });

    Lampa.Controller.collectionSet(this.html);
    Lampa.Controller.collectionFocus(this.html.find('.selector').first(), this.html);
  };

  Detail.prototype.play = function () {
    var detail = this.detail;

    if (!detail || !detail.iframe) {
      notify('Не знайдено iframe плеєра');
      return;
    }

    this.activity.loader(true);

    extractStream(detail.iframe, detail.url).then(function (streamUrl) {
      Lampa.Player.play({
        url: streamUrl,
        title: detail.title,
        card: {
          title: detail.title,
          original_title: detail.originalTitle,
          img: detail.image,
          source: PLUGIN_ID,
          url: detail.url
        }
      });
    }).catch(function (error) {
      notify(error.message);
    }).then(function () {
      if (Lampa.Activity.active() && Lampa.Activity.active().activity) Lampa.Activity.active().activity.loader(false);
    }, function () {
      if (Lampa.Activity.active() && Lampa.Activity.active().activity) Lampa.Activity.active().activity.loader(false);
    });
  };

  Detail.prototype.render = function () {
    return this.html;
  };

  Detail.prototype.destroy = function () {
    if (this.html) this.html.remove();
  };

  function addMenuButton() {
    if (!Lampa.Menu || !Lampa.Menu.addButton || $('.menu__item[data-uafix-menu="1"]').length) return;

    var button = Lampa.Menu.addButton(icon, 'UAFLIX', function () {
      Lampa.Activity.push({
        component: 'uafix_dashboard',
        title: 'UAFLIX'
      });
    });

    button.attr('data-uafix-menu', '1');
  }

  function init() {
    if (!window.Lampa) {
      setTimeout(init, 100);
      return;
    }

    Lampa.Component.add('uafix_dashboard', Dashboard);
    Lampa.Component.add('uafix_detail', Detail);

    if (window.appready) addMenuButton();
    else {
      Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') addMenuButton();
      });
    }

    console.log('[UAFLIX] plugin initialized');
  }

  init();
})();
