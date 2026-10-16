(function(){
  function msg(form,text,ok){var el=form.querySelector('.form-msg');if(!el){el=document.createElement('p');el.className='form-msg';form.appendChild(el)}el.textContent=text;el.style.color=ok?'#2e7d32':'#c62828'}
  document.addEventListener('submit',function(e){var form=e.target;if(!form.matches('form[data-site-form]'))return;e.preventDefault();e.stopImmediatePropagation();
    var data={};new FormData(form).forEach(function(v,k){if(k.charAt(0)!=='_')data[k]=v});
    var btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;
    fetch(form.getAttribute('action'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})
      .then(function(x){if(x.ok){msg(form,x.j.message||'Дякуємо! Ми зв’яжемося з вами.',true);form.reset()}else msg(form,x.j.error||'Помилка. Спробуйте ще раз.',false)})
      .catch(function(){msg(form,'Немає зв’язку із сервером. Спробуйте пізніше.',false)})
      .finally(function(){if(btn)btn.disabled=false})},true);
})();
