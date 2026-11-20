/* Tiny i18n: PT-BR / EN, picked from the TV menu language. */
(function (LL) {
  'use strict';

  var lang = String(navigator.language || 'en').toLowerCase().indexOf('pt') === 0 ? 'pt' : 'en';

  var STRINGS = {
    pt: {
      favorites: 'Favoritos', picks: 'Em alta nos seus apps', recents: 'Recentes',
      settings: 'Configurações', allApps: 'Todos os apps', addApp: 'Adicionar app',
      weather: 'Tempo', inputs: 'Entradas', auto: 'automático',
      hintTheme: 'Tema', hintSettings: 'Configurações', hintApps: 'Todos os apps', hintInputs: 'Entradas',
      hintFav: 'Favoritar', hintBack: 'Voltar', hintMove: 'Pegar / soltar', hintRemove: 'Remover', hintEdit: 'Editar atalho',
      opening: 'Abrindo {name}…', openingIn: 'Abrindo {name} — procure por “{title}”',
      notInstalled: '{name} não está instalado nesta TV', launchFailed: 'Não foi possível abrir {name}',
      theme_auto: 'Dia e noite (automático)', theme_night: 'Noite', theme_photo: 'Foto do dia', theme_oled: 'Preto puro',
      greetMorning: 'Bom dia', greetAfternoon: 'Boa tarde', greetEvening: 'Boa noite',
      favAdded: '{name} adicionado aos favoritos', favRemoved: '{name} removido dos favoritos',
      noApps: 'Nenhum app encontrado nesta TV.',
      secLook: 'Aparência', secWeather: 'Tempo', secHome: 'Tela inicial', secSystem: 'Sistema',
      setTheme: 'Tema', setWallpaper: 'Papel de parede próprio (URL de imagem)',
      setDim: 'Escurecer a tela', dim_off: 'Desativado', dim_low: 'Pouco', dim_medium: 'Médio', dim_high: 'Muito',
      dim_auto: 'Automático (22h–7h)',
      setSaver: 'Proteção de tela', minutes: '{n} min',
      setClock: 'Formato do relógio',
      setWeather: 'Mostrar o tempo', setCity: 'Cidade', setUnit: 'Temperatura',
      setRecents: 'Fileira “Recentes”', setPicks: 'Fileira “Em alta”',
      setTmdb: 'Chave TMDB (para “Em alta”)', tmdbHint: 'grátis em themoviedb.org/settings/api',
      tmdbBadKey: 'Chave TMDB inválida', tmdbCredit: 'Usa a API do TMDB, sem endosso ou certificação do TMDB.',
      setPerf: 'Desempenho', perfAuto: 'Automático ({tier})', perf_full: 'Completo', perf_flat: 'Equilibrado', perf_lite: 'Leve',
      setBoot: 'Animação de inicialização', on: 'Ativado', off: 'Desativado',
      setShelf: 'Organizar favoritos', setAddWeb: 'Adicionar atalho web',
      setReset: 'Restaurar padrões', resetConfirm: 'Pressione OK de novo para restaurar', resetDone: 'Padrões restaurados',
      setAbout: 'Sobre',
      shelfHelp: 'OK pega um app, ← → muda de lugar, OK solta.',
      shelfEmpty: 'Nenhum favorito ainda. Adicione em Todos os apps (tecla amarela).',
      editorNew: 'Novo atalho web', editorEdit: 'Editar atalho web',
      fieldName: 'Nome', fieldUrl: 'Endereço (URL)', fieldColor: 'Cor',
      save: 'Salvar', cancel: 'Cancelar', remove: 'Excluir', saved: 'Atalho salvo', removed: 'Removido dos favoritos',
      invalidName: 'Dê um nome ao atalho', invalidUrl: 'Endereço inválido',
      weatherUnavailable: 'Previsão indisponível. Verifique a conexão.',
      wMaxMin: 'Máx {max} · Mín {min}', wFeels: 'Sensação {v}', wHumidity: 'Umidade {v}%', wRainChance: 'Chuva {v}%',
      wSun: '☀ {rise} · ☾ {set}', wUv: 'UV {v}',
      wClear: 'Céu limpo', wPartly: 'Parcialmente nublado', wCloudy: 'Nublado', wFog: 'Neblina', wDrizzle: 'Garoa',
      wRain: 'Chuva', wSnow: 'Neve', wStorm: 'Tempestade',
      changeCity: 'Mudar cidade', refresh: 'Atualizar', updating: 'Atualizando…',
      inputTv: 'TV (antena)', connected: 'conectado', notConnected: 'desconectado',
      tvSettings: 'Configurações da TV', tvSettingsFailed: 'Não foi possível abrir as configurações da TV',
      switchingTo: 'Mudando para {name}…', inputFailed: 'Não foi possível mudar para {name}',
      cityTitle: 'Cidade', citySearch: 'Buscar cidade', cityAuto: 'Automático (fuso horário da TV)',
      searching: 'Buscando…', noResults: 'Nenhuma cidade encontrada', noConnection: 'Sem conexão',
      citySet: 'Cidade: {name}'
    },
    en: {
      favorites: 'Favorites', picks: 'Trending on your apps', recents: 'Recent',
      settings: 'Settings', allApps: 'All apps', addApp: 'Add app',
      weather: 'Weather', inputs: 'Inputs', auto: 'automatic',
      hintTheme: 'Theme', hintSettings: 'Settings', hintApps: 'All apps', hintInputs: 'Inputs',
      hintFav: 'Favorite', hintBack: 'Back', hintMove: 'Pick up / drop', hintRemove: 'Remove', hintEdit: 'Edit shortcut',
      opening: 'Opening {name}…', openingIn: 'Opening {name} — look for “{title}”',
      notInstalled: '{name} is not installed on this TV', launchFailed: 'Could not open {name}',
      theme_auto: 'Day & night (automatic)', theme_night: 'Night', theme_photo: 'Photo of the day', theme_oled: 'Pure black',
      greetMorning: 'Good morning', greetAfternoon: 'Good afternoon', greetEvening: 'Good evening',
      favAdded: '{name} added to favorites', favRemoved: '{name} removed from favorites',
      noApps: 'No apps found on this TV.',
      secLook: 'Look', secWeather: 'Weather', secHome: 'Home screen', secSystem: 'System',
      setTheme: 'Theme', setWallpaper: 'Custom wallpaper (image URL)',
      setDim: 'Dim the screen', dim_off: 'Off', dim_low: 'Low', dim_medium: 'Medium', dim_high: 'High',
      dim_auto: 'Automatic (10pm–7am)',
      setSaver: 'Screensaver', minutes: '{n} min',
      setClock: 'Clock format',
      setWeather: 'Show weather', setCity: 'City', setUnit: 'Temperature',
      setRecents: '“Recent” row', setPicks: '“Trending” row',
      setTmdb: 'TMDB key (for “Trending”)', tmdbHint: 'free at themoviedb.org/settings/api',
      tmdbBadKey: 'Invalid TMDB key', tmdbCredit: 'Uses the TMDB API but is not endorsed or certified by TMDB.',
      setPerf: 'Performance', perfAuto: 'Automatic ({tier})', perf_full: 'Full', perf_flat: 'Balanced', perf_lite: 'Lite',
      setBoot: 'Startup animation', on: 'On', off: 'Off',
      setShelf: 'Arrange favorites', setAddWeb: 'Add web shortcut',
      setReset: 'Restore defaults', resetConfirm: 'Press OK again to restore', resetDone: 'Defaults restored',
      setAbout: 'About',
      shelfHelp: 'OK picks an app up, ← → moves it, OK drops it.',
      shelfEmpty: 'No favorites yet. Add some in All apps (yellow key).',
      editorNew: 'New web shortcut', editorEdit: 'Edit web shortcut',
      fieldName: 'Name', fieldUrl: 'Address (URL)', fieldColor: 'Color',
      save: 'Save', cancel: 'Cancel', remove: 'Delete', saved: 'Shortcut saved', removed: 'Removed from favorites',
      invalidName: 'Give the shortcut a name', invalidUrl: 'Invalid address',
      weatherUnavailable: 'Forecast unavailable. Check the connection.',
      wMaxMin: 'High {max} · Low {min}', wFeels: 'Feels like {v}', wHumidity: 'Humidity {v}%', wRainChance: 'Rain {v}%',
      wSun: '☀ {rise} · ☾ {set}', wUv: 'UV {v}',
      wClear: 'Clear', wPartly: 'Partly cloudy', wCloudy: 'Cloudy', wFog: 'Fog', wDrizzle: 'Drizzle',
      wRain: 'Rain', wSnow: 'Snow', wStorm: 'Thunderstorm',
      changeCity: 'Change city', refresh: 'Refresh', updating: 'Updating…',
      inputTv: 'TV (antenna)', connected: 'connected', notConnected: 'not connected',
      tvSettings: 'TV settings', tvSettingsFailed: 'Could not open the TV settings',
      switchingTo: 'Switching to {name}…', inputFailed: 'Could not switch to {name}',
      cityTitle: 'City', citySearch: 'Search city', cityAuto: 'Automatic (TV time zone)',
      searching: 'Searching…', noResults: 'No city found', noConnection: 'No connection',
      citySet: 'City: {name}'
    }
  };

  function t(key, vars) {
    var s = STRINGS[lang][key] || STRINGS.en[key] || key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) {
        return vars[k] !== undefined && vars[k] !== null ? vars[k] : m;
      });
    }
    return s;
  }

  /* Fills [data-i18n] text and [data-i18n-label] aria-labels. */
  function apply(root) {
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-label]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-label')));
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  }

  LL.i18n = { lang: lang, t: t, apply: apply };
})(window.LL = window.LL || {});
