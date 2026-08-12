(function(){
  var burgerBtn = document.getElementById('burgerBtn');
  var menuOverlay = document.getElementById('menuOverlay');
  var menuCloseBtn = document.getElementById('menuCloseBtn');

  function openMenu(){
    menuOverlay.classList.add('is-open');
    menuOverlay.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeMenu(){
    menuOverlay.classList.remove('is-open');
    menuOverlay.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  burgerBtn.addEventListener('click', openMenu);
  menuCloseBtn.addEventListener('click', closeMenu);
  menuOverlay.querySelectorAll('.menu-link').forEach(function(link){
    link.addEventListener('click', closeMenu);
  });

  // side "grid" icon -> the sidebar itself expands into a fullscreen menu,
  // then content fades in; closing reverses the sequence (content out, then
  // the surface shrinks back to being just the sidebar). Timings below
  // (380ms / 400ms) are tuned to the CSS transition durations on
  // .mega-menu__surface (600ms) and .mega-menu__content (400ms) so content
  // starts revealing itself near the tail of the expansion, not before it.
  var megaMenu = document.getElementById('megaMenu');
  var megaMenuSurface = document.getElementById('megaMenuSurface');
  var megaMenuClose = document.getElementById('megaMenuClose');
  var megaMenuOpenTimer = null;
  var megaMenuCloseTimer = null;

  function openMegaMenu(){
    clearTimeout(megaMenuOpenTimer);
    clearTimeout(megaMenuCloseTimer);
    megaMenu.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    megaMenu.classList.add('is-expanding');
    megaMenuOpenTimer = setTimeout(function(){
      megaMenu.classList.add('is-content-visible');
    }, 380);
  }
  function closeMegaMenu(){
    clearTimeout(megaMenuOpenTimer);
    clearTimeout(megaMenuCloseTimer);
    megaMenu.classList.remove('is-content-visible');
    megaMenuCloseTimer = setTimeout(function(){
      megaMenu.classList.remove('is-expanding');
      megaMenu.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    }, 400);
  }
  document.getElementById('gridBtn').addEventListener('click', openMegaMenu);
  megaMenuClose.addEventListener('click', closeMegaMenu);
  megaMenuSurface.addEventListener('click', function(e){
    if(e.target === megaMenuSurface) closeMegaMenu();
  });
  megaMenu.querySelectorAll('.mega-menu__nav a').forEach(function(a){
    a.addEventListener('click', closeMegaMenu);
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && megaMenu.classList.contains('is-expanding')) closeMegaMenu();
  });

  // up / down section-style scroll
  document.getElementById('arrowUp').addEventListener('click', function(){
    window.scrollBy({top:-window.innerHeight, behavior:'smooth'});
  });
  document.getElementById('arrowDown').addEventListener('click', function(){
    window.scrollBy({top:window.innerHeight, behavior:'smooth'});
  });

  // update "01" section index + label + sidebar theme as user scrolls through sections
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
  var sideIndex = document.getElementById('sideIndex');
  var sideLocation = document.getElementById('sideLocation');
  var sidebarEl = document.querySelector('.sidebar');
  var siteFooter = document.getElementById('site-footer');
  function pad(n){ return n < 10 ? '0'+n : ''+n; }
  function updateIndex(){
    // hide the fixed sidebar once the footer (which has no sidebar in the design) enters view —
    // this must not skip the index/label update below it, or the sidebar freezes on whatever
    // section was current right before the footer started peeking into view (it never reaches
    // the last real section's own number, since the footer often appears before that section's
    // midpoint does).
    if(siteFooter && sidebarEl){
      var footerVisible = siteFooter.getBoundingClientRect().top < window.innerHeight;
      sidebarEl.classList.toggle('is-hidden', footerVisible);
    }
    var mid = window.scrollY + window.innerHeight/2;
    var current = 0;
    sections.forEach(function(sec, i){
      if(sec.offsetTop <= mid) current = i;
    });
    var sec = sections[current];
    if(!sec) return;
    var idx = sec.getAttribute('data-index');
    sideIndex.textContent = idx || pad(current+1);
    var label = sec.getAttribute('data-label');
    if(label) sideLocation.textContent = label;
    var theme = sec.getAttribute('data-sidebar');
    if(sidebarEl) sidebarEl.classList.toggle('is-dark', theme === 'dark');
  }
  window.addEventListener('scroll', updateIndex, {passive:true});
  updateIndex();

  // harmless feedback pulse for ticket / schedule CTAs (no real backend yet)
  document.querySelectorAll('[data-cta], [data-schedule]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      btn.classList.remove('is-pulsing');
      void btn.offsetWidth;
      btn.classList.add('is-pulsing');
    });
  });

  // ---------- Schedule & seat selection (block 02) ----------
  // Real venue layout (qtickets.ru), digitized from the client's screenshot:
  // 4 tribunes around the pool. Row strings: 'G'=available, 'x'=unavailable,
  // ' '=no seat at that grid slot (tapered/partial rows).
  // UX: overview plan shows 4 clickable tribune zones (no direct seat picking);
  // tapping a zone opens a modal with that tribune's own seat grid. Selections
  // are kept in a JS store (not just DOM state) since only one tribune's seats
  // exist in the DOM at a time.
  var TICKET_PRICE = 1600;
  var DISCOUNT_PRICE = 1300;

  var TRIB4_ROWS = [
    'GGGGGGGGGGGG',
    ' GGGGGGGGGG ',
    ' GGGGGGGGGG ',
    ' GGGGGGGGGG ',
    ' GGGGxxGGGG ',
    ' GGGGGGGGGG '
  ];
  var TRIB4_LABELS = [6,5,4,3,2,1];

  var TRIB3_ROWS = (function(){
    var rows = [];
    for(var i=0;i<28;i++) rows.push('GGGG');
    rows[16]='GxGG'; rows[17]='GxxG'; rows[18]='GxxG'; rows[19]='GxxG'; rows[20]='GGxG';
    return rows;
  })();

  var TRIB1_ROWS = ['   G','GGGG','GGGG','GGGG','GGGG','GGGG','GGGG','GGGG','GGGG','   G'];
  var TRIB2_ROWS = (function(){
    var rows = ['   G'];
    for(var i=0;i<12;i++) rows.push('xGGG');
    rows.push('   G');
    return rows;
  })();

  var TRIBUNES = {
    '4': {cols:12, rows:TRIB4_ROWS, rowLabels:TRIB4_LABELS, colHeader:false, title:'Трибуна 4', transpose:'normal'},
    '3': {cols:4, rows:TRIB3_ROWS, rowLabels:null, colHeader:true, title:'Трибуна 3', transpose:'normal'},
    '1': {cols:4, rows:TRIB1_ROWS, rowLabels:null, colHeader:true, title:'Трибуна 1', transpose:'normal'},
    '2': {cols:4, rows:TRIB2_ROWS, rowLabels:null, colHeader:true, title:'Трибуна 2', transpose:'normal'}
  };

  var selectedSeats = {}; // key "t-r-s" -> {t,r,s}
  function seatKey(t,r,s){ return t+'-'+r+'-'+s; }

  // Seat-map orientation follows the tribune's shape in the overview plan,
  // not the raw row/seat data: Трибуна 3 reads as a wide block below the
  // pool, so its 28 real rows run left-to-right (each real row becomes one
  // column). Трибуна 4 reads as a tall block to the pool's left, so its 6
  // real rows run top-to-bottom as columns too, but reversed so row 1 (the
  // row nearest the pool/stage in real life) ends up on the right — nearest
  // where the pool actually sits. Data-row/data-seat keep the real seat's
  // true numbers either way; only the on-screen arrangement changes.
  function buildSeatHTML(data, tribuneName, interactive){
    var html = '';

    if(data.transpose){
      var origRows = data.rows;
      var n = origRows.length;
      var order = [];
      for(var i=0;i<n;i++) order.push(i);
      if(data.transpose === 'reverse') order.reverse();

      var maxLen = 0;
      origRows.forEach(function(r){ maxLen = Math.max(maxLen, r.length); });

      var seatPx = n > 20 ? 17 : 34;
      var colStyle = 'style="grid-template-columns:repeat('+n+','+seatPx+'px)"';
      html += '<div class="seat-transpose-scroll"><div class="seat-transpose-inner">';
      html += '<div class="seat-colheader" '+colStyle+'>';
      order.forEach(function(origIdx){
        var lbl = data.rowLabels ? data.rowLabels[origIdx] : (origIdx+1);
        html += '<span>'+lbl+'</span>';
      });
      html += '</div>';

      for(var pos=0; pos<maxLen; pos++){
        html += '<div class="seat-rowline"><div class="seat-row-grid" '+colStyle+'>';
        order.forEach(function(origIdx){
          var rowStr = origRows[origIdx];
          var ch = pos < rowStr.length ? rowStr[pos] : ' ';
          var rowLabel = data.rowLabels ? data.rowLabels[origIdx] : (origIdx+1);
          if(ch === ' '){
            html += '<span class="seat seat--gap" aria-hidden="true"></span>';
          } else {
            var seatNum = 0;
            for(var i=0;i<=pos;i++){ if(rowStr.charAt(i) !== ' ') seatNum++; }
            var isUnavailable = ch === 'x';
            var isSelected = !!selectedSeats[seatKey(tribuneName, rowLabel, seatNum)];
            var cls = 'seat' + (isUnavailable ? ' seat--disabled' : '') + (isSelected ? ' seat--selected' : '');
            if(interactive){
              html += '<button type="button" class="'+cls+'" data-tribune="'+tribuneName+'" data-row="'+rowLabel+'" data-seat="'+seatNum+'"'+(isUnavailable ? ' disabled aria-label="Место недоступно"' : ' aria-label="Место '+seatNum+'"')+'></button>';
            } else {
              html += '<span class="'+cls+'" aria-hidden="true"></span>';
            }
          }
        });
        html += '</div></div>';
      }
      html += '</div></div>';
      return html;
    }

    if(data.colHeader){
      html += '<div class="seat-colheader cols-'+data.cols+'">';
      for(var c=1;c<=data.cols;c++){ html += '<span>'+c+'</span>'; }
      html += '</div>';
    }
    var rowOrder = [];
    for(var ri=0; ri<data.rows.length; ri++) rowOrder.push(ri);
    if(data.reverseRows) rowOrder.reverse();
    rowOrder.forEach(function(rIdx){
      var rowStr = data.rows[rIdx];
      var rowLabel = data.rowLabels ? data.rowLabels[rIdx] : (rIdx+1);
      html += '<div class="seat-rowline">';
      if(data.rowLabels){ html += '<span class="seat-rowline__label">'+rowLabel+'</span>'; }
      html += '<div class="seat-row-grid cols-'+data.cols+'">';
      var seatNum = 0;
      for(var i=0;i<rowStr.length;i++){
        var ch = rowStr[i];
        if(ch === ' '){
          html += '<span class="seat seat--gap" aria-hidden="true"></span>';
        } else {
          seatNum++;
          var isUnavailable = ch === 'x';
          var isSelected = !!selectedSeats[seatKey(tribuneName, rowLabel, seatNum)];
          var cls = 'seat' + (isUnavailable ? ' seat--disabled' : '') + (isSelected ? ' seat--selected' : '');
          if(interactive){
            html += '<button type="button" class="'+cls+'" data-tribune="'+tribuneName+'" data-row="'+rowLabel+'" data-seat="'+seatNum+'"'+(isUnavailable ? ' disabled aria-label="Место недоступно"' : ' aria-label="Место '+seatNum+'"')+'></button>';
          } else {
            html += '<span class="'+cls+'" aria-hidden="true"></span>';
          }
        }
      }
      html += '</div></div>';
    });
    return html;
  }

  function renderPreview(tribuneName){
    var card = document.querySelector('.plan2-zone[data-open-tribune="'+tribuneName+'"]');
    if(!card) return;
    var count = 0;
    Object.keys(selectedSeats).forEach(function(k){ if(selectedSeats[k].t === tribuneName) count++; });
    card.classList.toggle('has-selection', count > 0);
    var existingBadge = card.querySelector('.plan2-zone__badge');
    if(count > 0){
      var label = count + (count===1 ? ' место выбрано' : ' места выбрано');
      if(existingBadge){ existingBadge.textContent = label; }
      else {
        var badge = document.createElement('span');
        badge.className = 'plan2-zone__badge';
        badge.textContent = label;
        card.appendChild(badge);
      }
    } else if(existingBadge){
      existingBadge.remove();
    }
  }

  ['4','3','1','2'].forEach(renderPreview);

  function formatPrice(n){
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  var discountCount = 0; // how many of the selected tickets are concession-priced

  function updateOrderSummary(){
    var groups = {};
    var order = [];
    var total = 0;
    Object.keys(selectedSeats).forEach(function(key){
      var s = selectedSeats[key];
      total++;
      var gkey = s.t+'-'+s.r;
      if(!groups[gkey]){ groups[gkey] = {t:s.t, r:s.r, seats:[]}; order.push(gkey); }
      groups[gkey].seats.push(s.s);
    });
    var segments = order.map(function(key){
      var g = groups[key];
      g.seats.sort(function(a,b){return a-b;});
      var word = g.seats.length > 1 ? 'Места' : 'Место';
      return 'Трибуна '+g.t+' · Ряд '+g.r+' · '+word+' '+g.seats.join(', ');
    });
    if(discountCount > total) discountCount = total; // seats got deselected — keep it valid

    var seatsEl = document.getElementById('orderSeats');
    var ticketsEl = document.getElementById('orderTickets');
    var totalEl = document.getElementById('orderTotal');
    var fullCount = total - discountCount;
    var sum = fullCount * TICKET_PRICE + discountCount * DISCOUNT_PRICE;

    if(seatsEl) seatsEl.textContent = segments.length ? segments.join('; ') : 'Места не выбраны';
    if(ticketsEl){
      if(total === 0){
        ticketsEl.textContent = '0 × ' + formatPrice(TICKET_PRICE) + ' ₽';
      } else if(discountCount === 0){
        ticketsEl.textContent = total + ' × ' + formatPrice(TICKET_PRICE) + ' ₽';
      } else if(discountCount === total){
        ticketsEl.textContent = total + ' × ' + formatPrice(DISCOUNT_PRICE) + ' ₽';
      } else {
        ticketsEl.textContent = fullCount + ' × ' + formatPrice(TICKET_PRICE) + ' ₽ + ' + discountCount + ' × ' + formatPrice(DISCOUNT_PRICE) + ' ₽';
      }
    }
    if(totalEl) totalEl.textContent = formatPrice(sum) + ' ₽';

    var countEl = document.getElementById('discountCount');
    var minusBtn = document.getElementById('discountMinus');
    var plusBtn = document.getElementById('discountPlus');
    var discountNote = document.getElementById('discountNote');
    if(countEl) countEl.textContent = discountCount;
    if(minusBtn) minusBtn.disabled = discountCount <= 0;
    if(plusBtn) plusBtn.disabled = discountCount >= total;
    if(discountNote) discountNote.hidden = discountCount <= 0;
  }

  var discountMinus = document.getElementById('discountMinus');
  var discountPlus = document.getElementById('discountPlus');
  if(discountMinus) discountMinus.addEventListener('click', function(){
    if(discountCount > 0){ discountCount--; updateOrderSummary(); }
  });
  if(discountPlus) discountPlus.addEventListener('click', function(){
    var total = Object.keys(selectedSeats).length;
    if(discountCount < total){ discountCount++; updateOrderSummary(); }
  });

  var discountModal = document.getElementById('discountModal');
  function openDiscountModal(){
    if(!discountModal) return;
    discountModal.classList.add('is-open');
    discountModal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeDiscountModal(){
    if(!discountModal) return;
    discountModal.classList.remove('is-open');
    discountModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  var discountDocsLink = document.getElementById('discountDocsLink');
  if(discountDocsLink) discountDocsLink.addEventListener('click', function(e){ e.preventDefault(); openDiscountModal(); });
  var discountModalBackdrop = document.getElementById('discountModalBackdrop');
  if(discountModalBackdrop) discountModalBackdrop.addEventListener('click', closeDiscountModal);
  var discountModalClose = document.getElementById('discountModalClose');
  if(discountModalClose) discountModalClose.addEventListener('click', closeDiscountModal);
  var discountModalClose2 = document.getElementById('discountModalClose2');
  if(discountModalClose2) discountModalClose2.addEventListener('click', closeDiscountModal);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && discountModal && discountModal.classList.contains('is-open')) closeDiscountModal();
  });

  // ---------- Program modals (block 04 cards: show / swim / junior) ----------
  var programModalMap = {show:'programModalShow', swim:'programModalSwim', junior:'programModalJunior'};
  var programModalIds = ['programModalShow', 'programModalSwim', 'programModalJunior'];
  function openProgramModal(id){
    var modal = document.getElementById(id);
    if(!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeProgramModal(modal){
    if(!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('[data-open-program]').forEach(function(btn){
    btn.addEventListener('click', function(){
      openProgramModal(programModalMap[btn.getAttribute('data-open-program')]);
    });
  });
  document.querySelectorAll('[data-program-close]').forEach(function(el){
    el.addEventListener('click', function(){
      closeProgramModal(el.closest('.tribune-modal'));
    });
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    programModalIds.forEach(function(id){
      var m = document.getElementById(id);
      if(m && m.classList.contains('is-open')) closeProgramModal(m);
    });
  });

  // ---------- Payment modal ----------
  var paymentModal = document.getElementById('paymentModal');
  var paymentFormView = document.getElementById('paymentFormView');
  var paymentSuccessView = document.getElementById('paymentSuccessView');

  function resetPaymentModal(){
    if(paymentFormView) paymentFormView.hidden = false;
    if(paymentSuccessView) paymentSuccessView.hidden = true;
    ['cardNumber','cardExpiry','cardCvv'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.value = '';
    });
    var payByCardBtn = document.getElementById('payByCard');
    if(payByCardBtn){ payByCardBtn.disabled = false; payByCardBtn.querySelector('span').textContent = 'ОПЛАТИТЬ'; }
  }
  function openPaymentModal(){
    if(!paymentModal) return;
    var totalEl = document.getElementById('orderTotal');
    var amountEl = document.getElementById('paymentAmount');
    if(totalEl && amountEl) amountEl.textContent = totalEl.textContent;
    resetPaymentModal();
    paymentModal.classList.add('is-open');
    paymentModal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closePaymentModal(){
    if(!paymentModal) return;
    paymentModal.classList.remove('is-open');
    paymentModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  var checkoutBtn = document.getElementById('checkoutBtn');
  if(checkoutBtn) checkoutBtn.addEventListener('click', openPaymentModal);
  var paymentModalBackdrop = document.getElementById('paymentModalBackdrop');
  if(paymentModalBackdrop) paymentModalBackdrop.addEventListener('click', closePaymentModal);
  var paymentModalClose = document.getElementById('paymentModalClose');
  if(paymentModalClose) paymentModalClose.addEventListener('click', closePaymentModal);
  var paymentDoneBtn = document.getElementById('paymentDoneBtn');
  if(paymentDoneBtn) paymentDoneBtn.addEventListener('click', closePaymentModal);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && paymentModal && paymentModal.classList.contains('is-open')) closePaymentModal();
  });

  // input formatting — cosmetic only, no real validation/processing
  var cardNumberEl = document.getElementById('cardNumber');
  if(cardNumberEl) cardNumberEl.addEventListener('input', function(){
    var digits = cardNumberEl.value.replace(/\D/g,'').slice(0,16);
    cardNumberEl.value = digits.replace(/(.{4})/g,'$1 ').trim();
  });
  var cardExpiryEl = document.getElementById('cardExpiry');
  if(cardExpiryEl) cardExpiryEl.addEventListener('input', function(){
    var digits = cardExpiryEl.value.replace(/\D/g,'').slice(0,4);
    cardExpiryEl.value = digits.length > 2 ? digits.slice(0,2) + '/' + digits.slice(2) : digits;
  });
  var cardCvvEl = document.getElementById('cardCvv');
  if(cardCvvEl) cardCvvEl.addEventListener('input', function(){
    cardCvvEl.value = cardCvvEl.value.replace(/\D/g,'').slice(0,3);
  });

  function showPaymentSuccess(){
    if(paymentFormView) paymentFormView.hidden = true;
    if(paymentSuccessView) paymentSuccessView.hidden = false;
  }

  var payByCard = document.getElementById('payByCard');
  if(payByCard) payByCard.addEventListener('click', function(){
    var num = (cardNumberEl && cardNumberEl.value.replace(/\D/g,'')) || '';
    var exp = (cardExpiryEl && cardExpiryEl.value) || '';
    var cvv = (cardCvvEl && cardCvvEl.value) || '';
    if(num.length < 16 || exp.length < 5 || cvv.length < 3){
      [cardNumberEl, cardExpiryEl, cardCvvEl].forEach(function(el){
        if(el && !el.value){ el.style.borderColor = '#e8546b'; setTimeout(function(){ el.style.borderColor=''; }, 1200); }
      });
      return;
    }
    payByCard.disabled = true;
    payByCard.querySelector('span').textContent = 'ОПЛАЧИВАЕМ…';
    setTimeout(showPaymentSuccess, 900);
  });

  var payBySbp = document.getElementById('payBySbp');
  if(payBySbp) payBySbp.addEventListener('click', function(){
    payBySbp.disabled = true;
    setTimeout(showPaymentSuccess, 900);
  });

  // ---- tribune detail modal ----
  var tribuneModal = document.getElementById('tribuneModal');
  var tribuneModalSeats = document.getElementById('tribuneModalSeats');
  var tribuneModalTitle = document.getElementById('tribuneModalTitle');
  var currentTribune = null;

  function openTribuneModal(tribuneName){
    var data = TRIBUNES[tribuneName];
    if(!data) return;
    currentTribune = tribuneName;
    tribuneModalTitle.textContent = data.title;
    tribuneModalSeats.innerHTML = buildSeatHTML(data, tribuneName, true);
    tribuneModal.classList.add('is-open');
    tribuneModal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeTribuneModal(){
    tribuneModal.classList.remove('is-open');
    tribuneModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    currentTribune = null;
  }

  document.querySelectorAll('[data-open-tribune]').forEach(function(btn){
    btn.addEventListener('click', function(){
      openTribuneModal(btn.getAttribute('data-open-tribune'));
    });
  });
  document.getElementById('tribuneModalClose').addEventListener('click', closeTribuneModal);
  document.getElementById('tribuneModalBackdrop').addEventListener('click', closeTribuneModal);
  document.getElementById('tribuneModalDone').addEventListener('click', closeTribuneModal);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && tribuneModal.classList.contains('is-open')) closeTribuneModal();
  });

  tribuneModalSeats.addEventListener('click', function(e){
    var seatBtn = e.target.closest('.seat');
    if(!seatBtn || seatBtn.disabled || seatBtn.classList.contains('seat--gap') || !currentTribune) return;
    var t = seatBtn.getAttribute('data-tribune'), r = seatBtn.getAttribute('data-row'), s = seatBtn.getAttribute('data-seat');
    var key = seatKey(t,r,s);
    if(selectedSeats[key]){
      delete selectedSeats[key];
      seatBtn.classList.remove('seat--selected');
    } else {
      selectedSeats[key] = {t:t,r:r,s:parseInt(s,10)};
      seatBtn.classList.add('seat--selected');
    }
    renderPreview(t);
    updateOrderSummary();
  });

  updateOrderSummary();

  // date tabs
  document.querySelectorAll('.date-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.date-tab').forEach(function(t){ t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      var dt = document.getElementById('orderDatetime');
      if(dt) dt.textContent = tab.getAttribute('data-day') + ' · ' + tab.getAttribute('data-time');
    });
  });
  var dateNextBtn = document.getElementById('dateNext');
  if(dateNextBtn){
    dateNextBtn.addEventListener('click', function(){
      document.getElementById('dateTabs').scrollBy({left:260, behavior:'smooth'});
    });
  }

  // visit-conditions tabs (block 03)
  document.querySelectorAll('.cond-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      var key = tab.getAttribute('data-cond-tab');
      document.querySelectorAll('.cond-tab').forEach(function(t){
        t.classList.remove('is-active');
        t.setAttribute('aria-selected','false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected','true');
      document.querySelectorAll('.cond-panel').forEach(function(p){
        p.classList.toggle('is-active', p.getAttribute('data-cond-panel') === key);
      });
    });
  });

  // gallery lightbox (block 06)
  var galleryImages = Array.prototype.slice.call(document.querySelectorAll('.gallery-tile img')).map(function(img){
    return {src: img.getAttribute('src'), alt: img.getAttribute('alt')};
  });
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCounter = document.getElementById('lightboxCounter');
  var lbIndex = 0;

  function renderLightbox(){
    var item = galleryImages[lbIndex];
    if(!item) return;
    lightboxImg.setAttribute('src', item.src);
    lightboxImg.setAttribute('alt', item.alt);
    lightboxCounter.textContent = (lbIndex+1) + ' / ' + galleryImages.length;
  }
  function openLightbox(i){
    lbIndex = i;
    renderLightbox();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if(document.fullscreenElement) document.exitFullscreen();
  }
  function stepLightbox(delta){
    lbIndex = (lbIndex + delta + galleryImages.length) % galleryImages.length;
    renderLightbox();
  }

  document.querySelectorAll('.gallery-tile').forEach(function(tile){
    tile.addEventListener('click', function(){
      openLightbox(parseInt(tile.getAttribute('data-gallery-index'),10) || 0);
    });
  });
  var galleryOpenBtn = document.getElementById('galleryOpenBtn');
  if(galleryOpenBtn) galleryOpenBtn.addEventListener('click', function(){ openLightbox(0); });

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', function(){ stepLightbox(-1); });
  document.getElementById('lightboxNext').addEventListener('click', function(){ stepLightbox(1); });
  document.getElementById('lightboxFullscreen').addEventListener('click', function(){
    var fig = document.querySelector('.lightbox__figure');
    if(fig.requestFullscreen) fig.requestFullscreen();
  });
  lightbox.addEventListener('click', function(e){
    if(e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function(e){
    if(!lightbox.classList.contains('is-open')) return;
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowLeft') stepLightbox(-1);
    if(e.key === 'ArrowRight') stepLightbox(1);
  });

  // FAQ accordion (block 08)
  function setFaqItem(item, open){
    var answer = item.querySelector('.faq-item__a');
    item.classList.toggle('is-open', open);
    if(open){
      answer.style.maxHeight = answer.scrollHeight + 'px';
    } else {
      answer.style.maxHeight = '';
    }
  }
  document.querySelectorAll('.faq-item').forEach(function(item){
    item.querySelector('.faq-item__q').addEventListener('click', function(){
      var willOpen = !item.classList.contains('is-open');
      setFaqItem(item, willOpen);
    });
    if(item.hasAttribute('data-default-open')) setFaqItem(item, true);
  });
  window.addEventListener('resize', function(){
    document.querySelectorAll('.faq-item.is-open').forEach(function(item){
      item.querySelector('.faq-item__a').style.maxHeight = item.querySelector('.faq-item__a').scrollHeight + 'px';
    });
  });

  // footer back-to-top
  var footerToTop = document.getElementById('footerToTop');
  if(footerToTop){
    footerToTop.addEventListener('click', function(){
      window.scrollTo({top:0, behavior:'smooth'});
    });
  }
})();