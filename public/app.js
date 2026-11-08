(() => {
  const body = document.body;
  const sidebar = document.getElementById('app-sidebar');
  const openButton = document.querySelector('[data-sidebar-open]');
  const collapseButton = document.querySelector('[data-sidebar-collapse]');
  const closeButton = document.querySelector('[data-sidebar-close]');
  const dismissButton = document.querySelector('[data-sidebar-dismiss]');
  const mobile = window.matchMedia('(max-width: 760px)');

  const setCollapsed = (collapsed) => {
    body.toggleAttribute('data-sidebar-collapsed', collapsed);
    collapseButton?.setAttribute('aria-pressed', String(collapsed));
    collapseButton?.setAttribute('aria-label', collapsed ? 'Expandir menú' : 'Contraer menú');
    if (collapseButton) collapseButton.title = collapsed ? 'Expandir menú' : 'Contraer menú';
  };
  if (sidebar) {
    try { setCollapsed(window.localStorage.getItem('planes.sidebarCollapsed') === 'true'); }
    catch { setCollapsed(false); }
  }
  const syncMobile = (open) => {
    if (!sidebar) return;
    sidebar.inert = mobile.matches && !open;
    sidebar.toggleAttribute('role', mobile.matches && open);
    if (mobile.matches && open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
    } else sidebar.removeAttribute('aria-modal');
    document.querySelector('main')?.toggleAttribute('inert', mobile.matches && open);
    document.querySelector('.app-topbar')?.toggleAttribute('inert', mobile.matches && open);
  };
  const setMobileOpen = (open) => {
    body.toggleAttribute('data-sidebar-open', open);
    openButton?.setAttribute('aria-expanded', String(open));
    syncMobile(open);
    if (open) sidebar?.querySelector('a')?.focus();
    else openButton?.focus();
  };
  syncMobile(false);
  openButton?.addEventListener('click', () => setMobileOpen(true));
  closeButton?.addEventListener('click', () => setMobileOpen(false));
  dismissButton?.addEventListener('click', () => setMobileOpen(false));
  collapseButton?.addEventListener('click', () => {
    const collapsed = !body.hasAttribute('data-sidebar-collapsed');
    setCollapsed(collapsed);
    try { window.localStorage.setItem('planes.sidebarCollapsed', String(collapsed)); }
    catch { /* La navegación funciona aunque el almacenamiento no esté disponible. */ }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && body.hasAttribute('data-sidebar-open')) setMobileOpen(false);
    if (event.key === 'Tab' && mobile.matches && body.hasAttribute('data-sidebar-open')) {
      const controls = [...sidebar.querySelectorAll('a[href], button:not([disabled])')]
        .filter((node) => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  mobile.addEventListener?.('change', () => {
    body.removeAttribute('data-sidebar-open');
    openButton?.setAttribute('aria-expanded', 'false');
    syncMobile(false);
  });

  const timeZone = body.dataset.timeZone || 'America/Bogota';
  const dateNode = document.querySelector('[data-current-date]');
  const updateLocalDate = () => {
    const now = new Date();
    if (dateNode) {
      const formattedDate = new Intl.DateTimeFormat('es-CO', {
        timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).format(now);
      dateNode.textContent = formattedDate.charAt(0).toLocaleUpperCase('es-CO') + formattedDate.slice(1);
      dateNode.dateTime = now.toISOString();
    }
  };
  if (dateNode) {
    updateLocalDate();
    window.setInterval(updateLocalDate, 60 * 1000);
  }

  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const input = document.getElementById(button.getAttribute('aria-controls'));
    if (!input) return;
    button.addEventListener('click', () => {
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(visible));
      button.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
      button.title = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
      button.querySelector('svg')?.classList.toggle('is-password-visible', visible);
    });
  });

  // Edición en línea fuera de las tablas: conserva los formularios y su envío nativo.
  document.querySelectorAll('[data-record-editor]').forEach((editor) => {
    const triggers = [...document.querySelectorAll('[data-record-open]')]
      .filter((button) => button.getAttribute('aria-controls') === editor.id);
    const closeEditor = () => {
      editor.open = false;
      triggers.forEach((button) => button.setAttribute('aria-expanded', 'false'));
      (triggers[0] || editor.querySelector('summary'))?.focus();
    };
    triggers.forEach((button) => button.addEventListener('click', () => {
      editor.open = true;
      button.setAttribute('aria-expanded', 'true');
      editor.scrollIntoView({ block: 'start' });
      editor.querySelector('input:not([type="hidden"]), textarea, select')?.focus({ preventScroll: true });
    }));
    editor.addEventListener('toggle', () => {
      triggers.forEach((button) => button.setAttribute('aria-expanded', String(editor.open)));
    });
    editor.querySelector('[data-record-close]')?.addEventListener('click', closeEditor);
    editor.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && editor.open) {
        event.preventDefault();
        closeEditor();
      }
    });
  });

  document.querySelectorAll('form[data-loading-form]').forEach((form) => {
    form.addEventListener('submit', () => {
      const button = form.querySelector('[type="submit"]');
      if (!button || !form.reportValidity()) return;
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Procesando…';
      button.setAttribute('aria-busy', 'true');
    });
  });

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      const message = form.dataset.confirm || '¿Confirmas esta operación?';
      if (!window.confirm(message)) event.preventDefault();
    });
  });

  const weather = document.querySelector('[data-weather-widget]');
  if (weather) {
    const cityInput = weather.querySelector('[name="city"]');
    const result = weather.querySelector('[data-weather-result]');
    const icon = weather.querySelector('[data-weather-icon]');
    try {
      const savedCity = window.localStorage.getItem('planes.weatherCity');
      if (savedCity && cityInput) cityInput.value = savedCity;
    } catch { /* El widget sigue funcionando aunque el navegador bloquee el almacenamiento local. */ }
    const setUnavailable = (city) => {
      result.textContent = `${city || 'Villavicencio, Meta'} · Clima no disponible`;
    };
    const loadWeather = async (city) => {
      setUnavailable(city);
      try {
        const response = await fetch(`/api/clima?city=${encodeURIComponent(city || '')}`, { headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.available) return;
        if (icon && data.icon) icon.textContent = data.icon;
        result.textContent = `${data.city} · ${data.temperature} °C · ${data.condition} · Actualizado ${new Intl.DateTimeFormat('es-CO', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt))}`;
      } catch { setUnavailable(city); }
    };
    weather.addEventListener('submit', (event) => {
      event.preventDefault();
      const city = cityInput?.value?.trim() || '';
      try { if (city) window.localStorage.setItem('planes.weatherCity', city); } catch { /* Preferencia opcional. */ }
      loadWeather(city);
    });
    loadWeather(cityInput?.value?.trim());
  }

  const loginWeather = document.querySelector('[data-login-weather]');
  if (loginWeather) {
    const result = loginWeather.querySelector('[data-weather-result]');
    const icon = loginWeather.querySelector('[data-weather-icon]');
    const updated = loginWeather.querySelector('[data-weather-updated]');
    const refreshWeather = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      loginWeather.setAttribute('aria-busy', 'true');
      if (result) result.textContent = 'Consultando el clima…';
      if (updated) updated.textContent = '';
      try {
        const response = await fetch('/api/clima-publico', {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('WEATHER_UNAVAILABLE');
        const data = await response.json();
        if (!data.available || !Number.isFinite(data.temperature) ||
            typeof data.condition !== 'string' || typeof data.icon !== 'string' ||
            typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt))) {
          throw new Error('WEATHER_UNAVAILABLE');
        }
        if (icon) icon.textContent = data.icon;
        if (result) result.textContent = `${data.temperature} °C · ${data.condition}`;
        if (updated) {
          const time = new Intl.DateTimeFormat('es-CO', {
            timeZone, hour: '2-digit', minute: '2-digit'
          }).format(new Date(data.updatedAt));
          updated.textContent = `Actualizado ${time}`;
        }
      } catch {
        if (icon) icon.textContent = '—';
        if (result) result.textContent = 'Clima temporalmente no disponible.';
      } finally {
        loginWeather.setAttribute('aria-busy', 'false');
        window.clearTimeout(timeout);
      }
    };
    void refreshWeather();
    window.setInterval(refreshWeather, 15 * 60 * 1000);
  }
})();
// Institutional draft collections: additions only; existing records are never deleted here.
document.querySelectorAll('[data-institution-collection]').forEach(collection => {
  collection.querySelector('[data-institution-add]')?.addEventListener('click', () => {
    const items = collection.querySelectorAll('.institutional-item');
    if (!items.length || items.length >= 100) return;
    const item = items[0].cloneNode(true);
    item.querySelectorAll('input,textarea').forEach(control => { control.value = ''; });
    collection.insertBefore(item, collection.querySelector('[data-institution-add]'));
    item.querySelector('textarea,input:not([type="hidden"])')?.focus();
  });
});
document.querySelectorAll('form').forEach(form => {
  const links = form.querySelectorAll('[data-institution-link]');
  if (!links.length) return;
  const plan = form.querySelector('[name="id_plan"], [data-institution-plan]');
  const synchronize = () => links.forEach(select => {
    Array.from(select.options).forEach(option => {
      if (!option.dataset.plan) return;
      option.hidden = option.disabled = option.dataset.plan !== plan?.value;
    });
    if (select.selectedOptions[0]?.disabled) select.value = '';
  });
  plan?.addEventListener('change', synchronize);
  synchronize();
});

// A formal action must not silently abandon unsaved preparation fields.
document.querySelectorAll('[data-workflow-profile]').forEach(form => {
  let dirty = false;
  const actions = [...document.querySelectorAll('[data-workflow-action]')];
  const changed = () => {
    dirty = true;
    document.querySelector('[data-workflow-unsaved]')?.removeAttribute('hidden');
    actions.forEach(action => action.querySelectorAll('[type="submit"]').forEach(button => { button.disabled = true; }));
  };
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  actions.forEach(action => action.addEventListener('submit', event => { if (dirty) event.preventDefault(); }));
});

// Bounded binary evidence upload: no base64, no file content in session/local storage.
document.querySelectorAll('[data-binary-evidence]').forEach(form=>{
 form.addEventListener('submit',async event=>{
  event.preventDefault();const error=form.parentElement.querySelector('[data-evidence-error]');const button=form.querySelector('[type="submit"]');
  const file=form.elements.archivo.files[0],notes=form.elements.observaciones.value,max=Number(form.dataset.maxBytes);
  error.hidden=false;
  if(!file||!file.size||file.size>max){error.textContent='Selecciona un archivo de hasta 10 MB.';return;}
  if(new TextEncoder().encode(notes).length>2048){error.textContent='Las observaciones superan 2048 bytes UTF-8.';return;}
  button.disabled=true;error.textContent='Cargando evidencia...';
  try{const headers={'Content-Type':'application/octet-stream','X-CSRF-Token':form.elements.csrfToken.value,'X-Evidence-Name':encodeURIComponent(file.name),'X-Evidence-Type':file.type,'X-Evidence-Notes':encodeURIComponent(notes)};
   if(form.elements.id_seguimiento.value)headers['X-Followup-Id']=form.elements.id_seguimiento.value;
   const response=await fetch(form.action,{method:'POST',headers,body:file});
   if(!response.ok){const body=await response.json().catch(()=>({}));error.textContent=body.error||'No se pudo cargar; la selección permanece en el formulario.';return;}
   window.location.reload();
  }catch{error.textContent='No se pudo completar la carga. Conservamos la selección para reintentar.';}finally{button.disabled=false;}
 });
});
document.querySelectorAll('[data-report-print]').forEach(button => {
    button.addEventListener('click', () => window.print());
});
// Report query progress applies only to navigations, never to file downloads.
document.querySelectorAll('[data-query-progress]').forEach(form => {
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[data-query-status]');
    form.addEventListener('submit', () => {
        form.setAttribute('aria-busy', 'true');
        if (button) button.disabled = true;
        if (status) status.hidden = false;
    });
    window.addEventListener('pageshow', () => {
        form.removeAttribute('aria-busy');
        if (button) button.disabled = false;
        if (status) status.hidden = true;
    });
});
