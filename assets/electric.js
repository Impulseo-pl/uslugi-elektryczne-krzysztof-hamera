/* ============================================================================
   ELECTRIC - iskry i przeplyw pradu.
   Nic tu nie dotyka tresci strony: warstwa dokłada wylacznie elementy
   ozdobne (aria-hidden, pointer-events:none), wiec tresc i czytniki ekranu
   widza dokladnie to samo co wczesniej.
   ========================================================================= */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}

  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  /* ---------------------------------------------------------------- 1)
     PASEK NAPIECIA - postep czytania jako przewod pod napieciem. */
  (function pasek() {
    var bar = el('div', 'volt-bar'), fill = el('i');
    bar.setAttribute('aria-hidden', 'true');
    bar.appendChild(fill);
    document.body.appendChild(bar);
    var tick = false;
    function licz() {
      tick = false;
      var d = document.documentElement;
      var max = (d.scrollHeight - window.innerHeight) || 1;
      var p = Math.max(0, Math.min(1, (window.pageYOffset || d.scrollTop) / max));
      fill.style.setProperty('--volt-p', (p * 100).toFixed(2) + '%');
    }
    addEventListener('scroll', function () {
      if (!tick) { tick = true; requestAnimationFrame(licz); }
    }, { passive: true });
    addEventListener('resize', licz, { passive: true });
    licz();
  })();

  /* ---------------------------------------------------------------- 2)
     SZYNA POD PASKIEM NAWIGACJI - impuls przebiega raz na kilka sekund. */
  (function szyna() {
    if (reduce) return;
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var b = el('div', 'volt-busbar');
    b.setAttribute('aria-hidden', 'true');
    nav.appendChild(b);
  })();

  /* ---------------------------------------------------------------- 3)
     OBWOD W NAGLOWKU - sciezki jak na plytce drukowanej, impuls po nich.
     Rysowane w viewBox 1200x700 i przycinane (slice), zeby na kazdym
     ekranie wypelnialy naglowek bez rozciagania proporcji. */
  var SCIEZKI = [
    { d: 'M-40 118 H262 L342 198 H618 L698 118 H1240',                       t: 7.6, o: 0 },
    { d: 'M-40 558 H178 L258 478 H522 L602 558 H902 L982 478 H1240',         t: 9.4, o: 1.9 },
    { d: 'M304 -40 V58 L384 138 V298 L304 378 V740',                          t: 8.2, o: 3.4 },
    { d: 'M1002 -40 V178 L922 258 V462 L1012 552 V740',                       t: 6.8, o: .9 },
    { d: 'M-40 320 H120 L200 240 H424 L504 320 H762 L842 400 H1240',         t: 10.6, o: 4.6 }
  ];
  var WEZLY = [
    [342, 198, 0], [618, 198, 1.4], [258, 478, 2.2], [902, 558, .6],
    [384, 138, 3.1], [922, 258, 1.8], [504, 320, 2.7], [762, 320, 4.1]
  ];

  function obwod(host) {
    if (reduce || !host) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'volt-circuit');
    svg.setAttribute('viewBox', '0 0 1200 700');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    SCIEZKI.forEach(function (s) {
      var t = document.createElementNS(NS, 'path');
      t.setAttribute('class', 'vc-trace'); t.setAttribute('d', s.d);
      svg.appendChild(t);
    });
    SCIEZKI.forEach(function (s) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('class', 'vc-pulse'); p.setAttribute('d', s.d);
      p.setAttribute('pathLength', '1000');
      p.style.setProperty('--d', s.t + 's');
      p.style.setProperty('--dl', s.o + 's');
      svg.appendChild(p);
    });
    WEZLY.forEach(function (w) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'vc-node');
      c.setAttribute('cx', w[0]); c.setAttribute('cy', w[1]); c.setAttribute('r', 4.5);
      c.style.setProperty('--dl', w[2] + 's');
      svg.appendChild(c);
    });
    host.insertBefore(svg, host.firstChild);
  }

  var naglowek = document.querySelector('.hero-fach') || document.querySelector('.pagehead');
  obwod(naglowek);

  /* ---------------------------------------------------------------- 4)
     ISKRY - canvas wewnatrz ciemnych sekcji. W naglowku sypia sie same,
     po prawej stronie kadru (tam nie ma tekstu). W pasach "Awaria" i
     "Wspolpraca" sypia sie spod palca, gdy ktos siega po numer.
     Petla animacji chodzi TYLKO gdy cos sie pali - zero pracy na jalowym
     biegu, zero mielenia baterii przy zwinietej karcie. */
  function Iskry(host, klasa) {
    var c = el('canvas', 'volt-sparks' + (klasa ? ' ' + klasa : ''));
    c.setAttribute('aria-hidden', 'true');
    host.appendChild(c);
    var ctx = c.getContext('2d');
    if (!ctx) return null;

    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
    /* Mierzymy PLOTNO, nie gospodarza. Przy iskrach na styku sekcji gospodarz
       (.styk) ma wysokosc 0, a canvas jest pasem rozpietym wokol niego. Dla
       naglowka i ciemnych pasow canvas ma inset:0, wiec wynik jest ten sam. */
    function wymiar() {
      /* zerujemy rozmiar z poprzedniego pomiaru - inaczej po zmianie okna
         mierzylibysmy stara wartosc wpisana wprost w styl elementu */
      c.style.width = ''; c.style.height = '';
      var r = c.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      c.style.width = W + 'px'; c.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    wymiar();
    addEventListener('resize', wymiar, { passive: true });

    var P = [], raf = 0, ost = 0;

    /* Na CIEMNYM tle iskry rysujemy trybem `lighter` (swiatlo dodaje sie do tla,
       rdzen wychodzi bialy). Na JASNYM tle ten sam tryb jest niewidoczny - bieli
       nie da sie rozjasnic - wiec malujemy normalnie, cieplym pomaranczem, ktory
       na papierze czyta sie jak iskra spod szlifierki (zmierzone 10.09.2026). */
    var jasneTlo = false;
    var BARWY_CIEMNE = ['rgba(255,246,219,', 'rgba(255,194,26,', 'rgba(255,122,24,'];
    var BARWY_JASNE  = ['rgba(255,146,16,', 'rgba(236,110,8,',  'rgba(178,74,6,'];

    function klatka(t) {
      raf = 0;
      var dt = ost ? Math.min((t - ost) / 16.67, 2.6) : 1;
      ost = t;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = jasneTlo ? 'source-over' : 'lighter';
      ctx.lineCap = 'round';
      for (var i = P.length - 1; i >= 0; i--) {
        var p = P[i];
        p.px = p.x; p.py = p.y;
        p.vy += .09 * dt;                 /* grawitacja - iskra opada jak spod szlifierki */
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.zyc += dt;
        var u = p.zyc / p.max;
        if (u >= 1 || p.y > H + 40) { P.splice(i, 1); continue; }
        var a = 1 - u;
        /* barwa stygnacej iskry: jasny rdzen, potem zolc, na koniec pomarancz */
        var barwy = jasneTlo ? BARWY_JASNE : BARWY_CIEMNE;
        var kol = u < .28 ? barwy[0] : (u < .62 ? barwy[1] : barwy[2]);
        ctx.strokeStyle = kol + (a * .95).toFixed(3) + ')';
        ctx.lineWidth = p.w * (1 - u * .55) * (jasneTlo ? 1.35 : 1);
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (P.length) start(); else { ost = 0; ctx.clearRect(0, 0, W, H); }
    }
    function start() { if (!raf && !document.hidden) raf = requestAnimationFrame(klatka); }

    function sypnij(x, y, n, sila) {
      n = n || 16; sila = sila || 1;
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.7;
        var s = (1.3 + Math.random() * 4.4) * sila;
        P.push({
          x: x, y: y, px: x, py: y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          zyc: 0, max: 34 + Math.random() * 48,
          w: .7 + Math.random() * 1.5
        });
      }
      if (P.length > 300) P.splice(0, P.length - 300);
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0; P.length = 0; ost = 0; ctx.clearRect(0, 0, W, H);
      }
    });

    return {
      host: host,
      sypnij: sypnij,
      ramka: function () { return c.getBoundingClientRect(); },
      naJasnym: function (tak) { jasneTlo = !!tak; },
      /* jedno plotno obsluguje wszystkie styki po kolei - przenosimy je tam,
         gdzie akurat idzie luk, zamiast trzymac kilkanascie canvasow naraz */
      przypnij: function (nowy) { host = nowy; nowy.appendChild(c); wymiar(); },
      odepnij: function () {
        if (raf) cancelAnimationFrame(raf);
        raf = 0; P.length = 0; ost = 0;
        ctx.clearRect(0, 0, W, H);
        if (c.parentNode) c.parentNode.removeChild(c);
      },
      widoczny: function () {
        var r = host.getBoundingClientRect();
        return r.bottom > 40 && r.top < (window.innerHeight - 40);
      },
      szer: function () { return W; },
      wys: function () { return H; }
    };
  }

  if (!reduce) (function iskry() {
    var silniki = [];
    if (naglowek) silniki.push({ typ: 'sam', s: Iskry(naglowek) });
    ['.awaria', '.cta'].forEach(function (sel) {
      var h = document.querySelector(sel);
      if (h) silniki.push({ typ: 'palec', s: Iskry(h) });
    });
    silniki = silniki.filter(function (x) { return x.s; });
    if (!silniki.length) return;

    /* --- iskry samoczynne w naglowku --- */
    var sam = silniki.filter(function (x) { return x.typ === 'sam'; })[0];
    if (sam) (function samoczynne() {
      setTimeout(function () {
        samoczynne();
        if (document.hidden || !sam.s.widoczny()) return;
        var W = sam.s.szer(), H = sam.s.wys();
        /* prawa strona kadru: tam konczy sie kolumna z tekstem */
        var lewa = W > 900 ? W * .62 : W * .58;
        var x = lewa + Math.random() * (W * .95 - lewa);
        var y = H * (.16 + Math.random() * .6);
        sam.s.sypnij(x, y, 12 + Math.round(Math.random() * 10), .9);
      }, 1500 + Math.random() * 2200);
    })();

    /* --- iskry spod palca przy numerze w ciemnych pasach --- */
    function zPrzycisku(e) {
      var b = e.target && e.target.closest ? e.target.closest('.btn-accent,.btn-light,.btn-ghost') : null;
      if (!b) return;
      for (var i = 0; i < silniki.length; i++) {
        if (silniki[i].typ !== 'palec' || !silniki[i].s.host.contains(b)) continue;
        var hr = silniki[i].s.host.getBoundingClientRect(), br = b.getBoundingClientRect();
        silniki[i].s.sypnij(br.left - hr.left + br.width * (.25 + Math.random() * .5),
                            br.top - hr.top + br.height * .5, 16, 1.15);
        return;
      }
    }
    document.addEventListener('pointerover', zPrzycisku, { passive: true });
    document.addEventListener('click', zPrzycisku, { passive: true });
  })();

  /* ---------------------------------------------------------------- 5)
     STYK SEKCJI - animowane przejscie miedzy sekcjami.
     (prosba Szymona 10.09.2026: "animowane przejscia miedzy sekcjami
      i efekt iskier - jak u klienta NIKO meble")

     W miejscu, gdzie konczy sie jedna sekcja a zaczyna nastepna, siedzi
     styk o wysokosci 0 - nie zmienia ukladu strony ani o piksel. Gdy sekcja
     wchodzi w kadr, po styku przebiega luk: punkt zaplonu jedzie od lewej
     do prawej, ciagnie za soba swiecacy przewod, sypie iskrami i zostawia
     krotki rozblysk. Kazdy styk gra RAZ (potem obserwator go zwalnia).

     Oszczednosc: JEDNO plotno na cala strone, przypinane do styku, ktory
     akurat gra, i zdejmowane 1,6 s po zakonczeniu. Petla iskier chodzi
     wylacznie w trakcie luku. */
  if (!reduce) (function styki() {
    if (!('IntersectionObserver' in window)) return;
    var main = document.querySelector('main');
    if (!main) return;

    var sekcje = Array.prototype.filter.call(main.children, function (n) {
      return n.tagName === 'SECTION';
    });
    if (sekcje.length < 2) return;

    /* Ciemna sekcja dostaje mocniejszy rozblysk. Rozpoznajemy ja po kolorze tla,
       a gdy tlo jest przezroczyste - po kolorze tekstu (jasny tekst = ciemne tlo). */
    function jasnosc(kolor) {
      var m = String(kolor).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      var t = m[1].split(',').map(parseFloat);
      if (t.length > 3 && t[3] < 0.5) return null;
      return (0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]) / 255;
    }
    function ciemna(sec) {
      var s = getComputedStyle(sec);
      var tlo = jasnosc(s.backgroundColor);
      if (tlo !== null) return tlo < 0.4;
      if (s.backgroundImage && s.backgroundImage !== 'none') return true;
      var txt = jasnosc(s.color);
      return txt !== null && txt > 0.6;
    }

    function zbuduj(przed) {
      var s = el('div', 'styk');
      s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<i class="styk-blysk"></i><i class="styk-tor"></i><i class="styk-luk"></i>';
      /* Sila rozblysku idzie od sekcji, KTORA WCHODZI (to do niej "wplywa prad"). */
      if (ciemna(przed)) s.classList.add('ciemny');
      /* Barwa iskier idzie od sekcji NAD stykiem - iskry leca glownie w gore,
         wiec to jej tlo decyduje, czy beda widoczne. Przy stopce nad stykiem
         stoi <main>, wiec siegamy po jego ostatnia sekcje. */
      var nad = przed.previousElementSibling;
      if (nad && nad.tagName === 'MAIN') nad = nad.lastElementChild;
      if (nad && nad.nodeType === 1 && !ciemna(nad)) s.setAttribute('data-jasne', '1');
      przed.parentNode.insertBefore(s, przed);
      return s;
    }

    var plotno = null, sprzatanie = 0;

    /* Styk zapala sie tylko tam, gdzie ma MIEJSCE. Pasy bez marginesow (rzad
       obietnic, opinie w jednej linii) maja tekst tuz przy granicy sekcji -
       luna przejechalaby wtedy po literach i przez sekunde psula ich czytelnosc.
       Zmierzone 10.09.2026: 3 z 13 stykow na stronie glownej. Takie styki
       zostaja ciche - to lepsze niz swiecacy napis. */
    var TEKST = 'p,h1,h2,h3,h4,li,blockquote,figcaption,dt,dd,td,th';
    function sasiad(s, wstecz) {
      var n = wstecz ? s.previousElementSibling : s.nextElementSibling;
      if (n && n.tagName === 'MAIN') n = wstecz ? n.lastElementChild : n.firstElementChild;
      return n;
    }
    function ciasno(s) {
      var y = s.getBoundingClientRect().top;
      for (var i = 0; i < 2; i++) {
        var sec = sasiad(s, i === 0);
        if (!sec) continue;
        var el = sec.querySelectorAll(TEKST);
        for (var j = 0; j < el.length; j++) {
          if (!(el[j].textContent || '').trim()) continue;
          var r = el[j].getBoundingClientRect();
          if (r.height && r.bottom > y - 44 && r.top < y + 44) return true;
        }
      }
      return false;
    }

    function zapal(s) {
      if (s.getAttribute('data-gra')) return;
      s.setAttribute('data-gra', '1');
      if (ciasno(s)) return;
      /* szerokosc toru podajemy w pikselach - 100vw liczy tez pasek przewijania */
      var szer = Math.round(s.getBoundingClientRect().width || main.clientWidth);
      s.style.setProperty('--styk-w', szer + 'px');
      s.classList.add('on');

      var luk = s.querySelector('.styk-luk');
      if (!luk) return;
      if (plotno) plotno.przypnij(s); else plotno = Iskry(s, 'iskry-styk');
      if (!plotno) return;
      plotno.naJasnym(s.getAttribute('data-jasne') === '1');
      if (sprzatanie) { clearTimeout(sprzatanie); sprzatanie = 0; }

      /* Iskry lecimy z REALNEJ pozycji punktu zaplonu (odczytanej z ukladu),
         a nie z wlasnego zegara - dzieki temu sa idealnie zgrane z animacja CSS,
         niezaleznie od tego, jak przegladarka rozlozy krzywa w czasie. */
      var start = 0, klatka = 0;
      requestAnimationFrame(function krok(t) {
        if (!start) start = t;
        var lr = luk.getBoundingClientRect(), cr = plotno.ramka();
        if (cr.width && lr.width && (klatka++ % 2) === 0) {
          plotno.sypnij(lr.left - cr.left + lr.width / 2,
                        lr.top - cr.top + lr.height / 2,
                        3 + Math.round(Math.random() * 3), 0.85);
        }
        if (t - start < 800) {
          requestAnimationFrame(krok);
        } else {
          sprzatanie = setTimeout(function () {
            sprzatanie = 0;
            if (plotno) plotno.odepnij();
          }, 1600);
        }
      });
    }

    var cele = sekcje.slice(1);
    var stopka = document.querySelector('footer');
    if (stopka && stopka.parentNode) cele.push(stopka);
    cele.forEach(zbuduj);

    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (!w.isIntersecting) return;
        io.unobserve(w.target);
        var s = w.target.previousElementSibling;
        if (!s || !s.classList.contains('styk')) return;
        /* Styk, ktory widac juz po wczytaniu strony, czekalby na nic - dajemy
           stronie chwile, zeby luk nie zlal sie z wjazdem tresci. */
        var teraz = (window.performance && performance.now) ? performance.now() : 1150;
        setTimeout(function () { zapal(s); }, Math.max(0, 1150 - teraz));
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0 });
    cele.forEach(function (c) { io.observe(c); });
  })();
})();
