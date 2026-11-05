// Regressão no navegador, com a sala simulada: não escreve no Firebase.
// Requer Playwright instalado; PLAYWRIGHT_MODULE e CHROME_PATH podem apontar para instalações locais.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const outputDir = fs.mkdtempSync(join(tmpdir(), 'medida-quadro-'));
const ROOT=process.cwd();
async function setup(page,file='app.html'){
 await page.route('**/*',route=>{const p=new URL(route.request().url()).pathname;let body='',contentType='text/plain';
 if(p==='/app.html'){body=fs.readFileSync(ROOT+'/app.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');contentType='text/html';}
 else if(p==='/tablet.html'){body=fs.readFileSync(ROOT+'/tablet.html','utf8').replace(/<script[^>]+src="(?:js\/config.js|js\/sala.js|\/js\/pwa.js)"[^>]*><\/script>/g,'');contentType='text/html';}
 else if(['/css/style.css','/js/quadro.js','/js/quadro-elementos.js'].includes(p)){body=fs.readFileSync(ROOT+p,'utf8');contentType=p.endsWith('.css')?'text/css':'text/javascript';}
 else return route.fulfill({status:204,body:''});return route.fulfill({contentType,body});});
 await page.goto('http://quadro.test/'+file+(file==='app.html'?'#/quadro':'#s=test&k=test'));
}
const legacy={nos:[{id:'box',tipo:'caixa',x:150,y:120,w:200,h:80,texto:'Página original'},{id:'note',tipo:'nota',x:430,y:180,w:170,h:110,texto:'Anotações\nDuas linhas'},{id:'tri',tipo:'triangulo',x:750,y:210,w:180,h:150,texto:'Triângulo'},{id:'txt',tipo:'texto',x:-450,y:-150,texto:'Fora da vista'}],setas:[{id:'s',a:'box',b:'note'}],tracos:[{id:'legacy',p:[0,0,100,0],w:3}],vista:{x:0,y:0,k:1}};
async function mount(page){for(const f of ['js/quadro-elementos.js','js/quadro-exportar.js','js/quadro.js'])await page.addScriptTag({content:fs.readFileSync(f,'utf8')});await page.evaluate(()=>{document.getElementById('boot').remove();for(const id of ['authWrap','topAuth'])document.getElementById(id).hidden=true;for(const id of ['shell','quadro'])document.getElementById(id).hidden=false;document.querySelector('#shell main.page').classList.add('larga');Quadro.abrir();});}
async function draw(page,color,y=450){await page.getByRole('button',{name:color,exact:true}).click();const r=await page.locator('#qTela').boundingBox();await page.mouse.move(r.x+120,r.y+y);await page.mouse.down();await page.mouse.move(r.x+350,r.y+y);await page.mouse.up();}
async function testarElementos(browser,errors) {
 const p=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});
 p.on('pageerror',e=>errors.push(e.message)); await setup(p); await mount(p);
 const catalogo=await p.evaluate(()=>ElementosQuadro.lista.map(({id,nome})=>({id,nome})));
 assert.equal(catalogo.length,28); assert.equal(new Set(catalogo.map(e=>e.id)).size,28);
 const menu=p.locator('#qInserirMenu'),busca=p.locator('#qElementos input');
 async function inserir(id) {
   await menu.locator('summary').click(); await busca.fill(id==='google-ads'?'adwords':catalogo.find(e=>e.id===id).nome);
   await menu.locator(`[data-elemento="${id}"]`).click();
   return p.evaluate(()=>Quadro.estado().nos.at(-1));
 }
 // Todos os elementos entram pelo menu real com símbolo, rótulo e quatro conectores.
 for(const {id,nome} of catalogo) {
   const n=await inserir(id); assert.equal(n.tipo,'estrategia'); assert.equal(n.elemento,id); assert.equal(n.texto,nome);
   const e=p.locator(`.qn[data-id="${n.id}"]`);
   assert.equal(await e.locator('.q-simbolo').count(),1); assert.equal(await e.locator('.qh').count(),4);
   assert.equal(await p.locator('[data-alinhar-vertical="center"]').getAttribute('aria-pressed'),'true');
   await p.locator('#qDesfazer').click(); assert.equal(await p.locator('.qn').count(),0);
 }
 await menu.locator('summary').click(); await busca.fill('zzzinexistente');
 assert.equal(await menu.getByRole('status').textContent(),'Nenhum elemento encontrado.');
 assert.equal(await menu.locator('[data-elemento]:visible').count(),0);
 await busca.fill(''); await p.screenshot({path:join(outputDir,'biblioteca.png')}); await p.keyboard.press('Escape');
 const amostra=['pessoa','email','pagina-de-vendas','instagram','google-ads','youtube'];
 for(let i=0;i<amostra.length;i++) {
   const n=await inserir(amostra[i]); await p.locator('#qSelecionar').click();
   const e=p.locator(`.qn[data-id="${n.id}"]`),r=await e.boundingBox(),tela=await p.locator('#qTela').boundingBox();
   await p.mouse.move(r.x+r.width/2,r.y+r.height/2); await p.mouse.down();
   await p.mouse.move(tela.x+60+i%3*300+90,tela.y+70+Math.floor(i/3)*260+60,{steps:5}); await p.mouse.up();
 }
 let estado=await p.evaluate(()=>Quadro.estado());
 const a=estado.nos[0],b=estado.nos[1];
 const h=await p.locator(`.qn[data-id="${a.id}"] .qh[data-lado="direita"]`).boundingBox();
 const destino=await p.locator(`.qn[data-id="${b.id}"]`).boundingBox();
 await p.mouse.move(h.x+7,h.y+7); await p.mouse.down(); await p.mouse.move(destino.x+90,destino.y+60,{steps:5}); await p.mouse.up();
 assert.equal(await p.locator('#qSetas .qs').count(),1);
 // Criação de outro símbolo ao soltar uma conexão em espaço vazio.
 const c=await p.locator(`.qn[data-id="${b.id}"] .qh[data-lado="baixo"]`).boundingBox(),tela=await p.locator('#qTela').boundingBox();
 await p.mouse.move(c.x+7,c.y+7); await p.mouse.down(); await p.mouse.move(tela.x+450,tela.y+650,{steps:5}); await p.mouse.up();
 const conectar=p.getByRole('menu',{name:'Criar elemento conectado'});
 await conectar.getByRole('searchbox',{name:'Buscar elementos prontos'}).fill('meta');
 await conectar.getByRole('menuitem',{name:'Meta',exact:true}).click();
 assert.equal(await p.locator('.qn.estrategia .q-simbolo').count(),7); assert.equal(await p.locator('#qSetas .qs').count(),2);
 const ultimo=await p.evaluate(()=>Quadro.estado().nos.at(-1)); assert.equal(ultimo.elemento,'meta');
 const meta=p.locator(`.qn[data-id="${ultimo.id}"]`);
 await meta.locator('.qt').fill('Campanha Meta'); await p.getByRole('button',{name:'Azul',exact:true}).click();
 await p.locator('#qFonte').fill('20'); await p.locator('#qFonte').press('Enter');
 await p.locator('[data-alinhar="right"]').click(); await p.locator('[data-alinhar-vertical="bottom"]').click();
 const editado=await p.evaluate(()=>Quadro.estado().nos.at(-1));
 assert.equal(editado.texto,'Campanha Meta'); assert.equal(editado.cor,'#2563eb'); assert.equal(editado.fonte,20);
 assert.equal(editado.alinhamento,'right'); assert.equal(editado.vertical,'bottom');
 await p.waitForFunction(()=>document.getElementById('qSalvo').textContent==='Salvo neste navegador');
 await p.reload(); await mount(p); estado=await p.evaluate(()=>Quadro.estado());
 assert.equal(estado.nos.length,7); assert.equal(await p.locator('.qn.estrategia .q-simbolo').count(),7);
 await p.evaluate(()=>{
   window.iconesExportados=0; const original=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img instanceof HTMLImageElement && img.src.startsWith('data:image/svg+xml'))iconesExportados++;return original.call(this,img,...args);};
 });
 const download=p.waitForEvent('download');await p.locator('#qExportMenu summary').click();await p.locator('#qExportarPagina').click();
 await (await download).saveAs(join(outputDir,'estrategia.jpg')); assert.equal(await p.evaluate(()=>iconesExportados),7);
 await p.screenshot({path:join(outputDir,'estrategia.png')});
 await p.evaluate(s=>Quadro.ver(s),estado); assert.equal(await p.locator('.qn.estrategia .q-simbolo').count(),7);
 console.log('✓ Biblioteca: 28 elementos pelo menu, busca e sinônimos, quatro conectores, criação conectada, texto/cores/fonte/alinhamentos, desfazer, recarga, sete símbolos no JPEG e visualização ao vivo.');
 await p.close(); return estado;
}
async function testarVertical(browser,errors) {
 const p=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});
 p.on('pageerror',e=>errors.push(e.message)); await setup(p);
 const tipos=['caixa','nota','circulo','losango','triangulo','texto'];
 const nos=tipos.map((tipo,i)=>({id:tipo,tipo,x:50+i%3*310,y:50+Math.floor(i/3)*340,w:240,h:260,fonte:20,alinhamento:'right',texto:'Linha longa\ncurta'}));
 await p.evaluate(nos=>localStorage.setItem('medida_quadro_v1',JSON.stringify({nos,setas:[],tracos:[],vista:{x:0,y:0,k:1}})),nos); await mount(p);
 const elemento=tipo=>p.locator(`.qn[data-id="${tipo}"]`),botao=v=>p.locator(`[data-alinhar-vertical="${v}"]`);
 async function confere(tipo,vertical) {
   const m=await elemento(tipo).evaluate(e=>{
     const b=e.getBoundingClientRect(),t=e.querySelector('.qt').getBoundingClientRect(),css=getComputedStyle(e),k=b.height/e.offsetHeight;
     return {y:(t.top-b.top)/k,h:t.height/k,top:parseFloat(css.paddingTop)+parseFloat(css.borderTopWidth),bottom:e.offsetHeight-parseFloat(css.paddingBottom)-parseFloat(css.borderBottomWidth)};
   });
   const atual=vertical==='top'?m.y:vertical==='bottom'?m.y+m.h:m.y+m.h/2;
   const esperado=vertical==='top'?m.top:vertical==='bottom'?m.bottom:(m.top+m.bottom)/2;
   assert.ok(Math.abs(atual-esperado)<2,`${tipo}: posição real deve alinhar ${vertical}`);
   assert.ok(m.y>=m.top-2 && m.y+m.h<=m.bottom+2,`${tipo}: texto deve caber na área interna`);
 }
 assert.equal(await botao('top').isDisabled(),true);
 for(const tipo of tipos) {
   await elemento(tipo).click();
   assert.equal(await botao(['circulo','losango','triangulo'].includes(tipo)?'center':'top').getAttribute('aria-pressed'),'true');
   for(const vertical of ['top','center','bottom']) {
     await botao(vertical).click(); await confere(tipo,vertical);
     assert.equal(await elemento(tipo).locator('.qt').evaluate(e=>getComputedStyle(e).textAlign),'right');
     assert.equal(await botao(vertical).getAttribute('aria-pressed'),'true');
   }
 }
 // A altura acompanha uma fonte maior dentro da área segura da forma.
 await elemento('triangulo').click(); await p.locator('#qFonte').fill('40'); await p.locator('#qFonte').press('Enter');
 await confere('triangulo','bottom'); await p.locator('#qDesfazer').click(); await confere('triangulo','bottom');
 await elemento('caixa').dblclick(); await elemento('caixa').locator('.qt').fill('Texto novo\ncurto'); await botao('top').click();
 assert.equal(await p.evaluate(()=>Quadro.estado().nos[0].texto),'Texto novo\ncurto');
 await p.locator('#qDesfazer').click(); await confere('caixa','bottom');
 for(let i=0;i<tipos.length;i++){await elemento(tipos[i]).click();await botao(['top','center','bottom'][i%3]).click();}
 await p.locator('#qCaneta').click(); assert.equal(await botao('center').isDisabled(),true);
 await p.locator('#qSelecionar').click(); assert.equal(await botao('bottom').getAttribute('aria-pressed'),'true');
 await p.locator('#qNovaPagina').click(); assert.equal(await botao('top').isDisabled(),true); await p.locator('#qAnterior').click();
 await p.waitForFunction(()=>document.getElementById('qSalvo').textContent==='Salvo neste navegador'); await p.reload(); await mount(p);
 for(let i=0;i<tipos.length;i++)await confere(tipos[i],['top','center','bottom'][i%3]);
 const esperadas=await p.locator('.qn').evaluateAll(es=>es.map(e=>{
   const t=e.querySelector('.qt').firstChild,r=document.createRange();r.setStart(t,0);r.setEnd(t,1);
   return r.getBoundingClientRect().top-e.getBoundingClientRect().top+parseFloat(e.style.top);
 }));
 await p.evaluate(()=>{
   window.linhasVerticais=[];const original=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(texto,x,y,...args){linhasVerticais.push(y-this.measureText(texto).fontBoundingBoxAscent);return original.call(this,texto,x,y,...args);};
 });
 const download=p.waitForEvent('download'); await p.locator('#qExportMenu summary').click(); await p.locator('#qExportarPagina').click();
 await (await download).saveAs(join(outputDir,'vertical.jpg'));
 const exportadas=await p.evaluate(()=>linhasVerticais); assert.equal(exportadas.length,12);
 esperadas.forEach((y,i)=>assert.ok(Math.abs(y-exportadas[i*2])<2,'JPEG conserva a posição vertical do texto'));
 await elemento('nota').click(); await p.screenshot({path:join(outputDir,'vertical.png')});
 const estado=await p.evaluate(()=>Quadro.estado()); await p.evaluate(s=>Quadro.ver(s),estado);
 for(let i=0;i<tipos.length;i++)await confere(tipos[i],['top','center','bottom'][i%3]);
 console.log('✓ Vertical: seis tipos, topo/centro/embaixo, área interna, fonte, alinhamento horizontal independente, edição, desfazer, páginas, recarga, JPEG e visualização ao vivo.');
}
async function testarAlinhamento(browser,errors) {
 const p=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});
 p.on('pageerror',e=>errors.push(e.message)); await setup(p);
 const tipos=['caixa','nota','circulo','losango','triangulo','texto'];
 const nos=tipos.map((tipo,i)=>({id:tipo,tipo,x:50+i%3*310,y:60+Math.floor(i/3)*300,w:240,h:220,fonte:20,texto:'Linha longa\ncurta'}));
 await p.evaluate(nos=>localStorage.setItem('medida_quadro_v1',JSON.stringify({nos,setas:[],tracos:[],vista:{x:0,y:0,k:1}})),nos); await mount(p);
 const seletor=tipo=>p.locator(`.qn[data-id="${tipo}"]`);
 const botao=alinhamento=>p.locator(`[data-alinhar="${alinhamento}"]`);
 const valor=tipo=>p.evaluate(tipo=>Quadro.estado().nos.find(n=>n.id===tipo),tipo);
 async function linhas(tipo) {
   return seletor(tipo).locator('.qt').evaluate(e=>{
     const t=e.firstChild,quebra=t.textContent.indexOf('\n'),r=document.createRange();
     return [[0,quebra],[quebra+1,t.length]].map(([a,b])=>{r.setStart(t,a);r.setEnd(t,b);const box=r.getBoundingClientRect();return {x:box.left,w:box.width};});
   });
 }
 function confere([a,b],alinhamento) {
   const pos=l=>alinhamento==='left'?l.x:alinhamento==='right'?l.x+l.w:l.x+l.w/2;
   assert.ok(Math.abs(pos(a)-pos(b))<2,`As linhas devem alinhar ${alinhamento}`);
 }
 assert.equal(await botao('left').isDisabled(),true);
 for(const tipo of tipos) {
   await seletor(tipo).click();
   assert.equal(await botao(tipo==='nota'?'left':'center').getAttribute('aria-pressed'),'true');
   for(const alinhamento of ['left','center','right']) {
     await botao(alinhamento).click();
     confere(await linhas(tipo),alinhamento);
     assert.equal(await botao(alinhamento).getAttribute('aria-pressed'),'true');
   }
 }
 const nota=await valor('nota');
 await seletor('caixa').dblclick(); await seletor('caixa').locator('.qt').fill('Texto novo\ncurto');
 await botao('left').click(); assert.equal((await valor('caixa')).texto,'Texto novo\ncurto');
 assert.deepEqual(await valor('nota'),nota,'A mudança afeta somente o elemento selecionado');
 await p.locator('#qDesfazer').click(); confere(await linhas('caixa'),'right');
 assert.equal((await valor('caixa')).texto,'Texto novo\ncurto');
 for(let i=0;i<tipos.length;i++){await seletor(tipos[i]).click();await botao(['left','center','right'][i%3]).click();}
 await p.locator('#qCaneta').click(); assert.equal(await botao('center').isDisabled(),true);
 await p.locator('#qSelecionar').click(); assert.equal(await botao('right').getAttribute('aria-pressed'),'true');
 await p.locator('#qNovaPagina').click(); assert.equal(await botao('left').isDisabled(),true);
 await p.locator('#qAnterior').click();
 await p.waitForFunction(()=>document.getElementById('qSalvo').textContent==='Salvo neste navegador');
 await p.reload(); await mount(p);
 for(let i=0;i<tipos.length;i++)confere(await linhas(tipos[i]),['left','center','right'][i%3]);
 await p.evaluate(()=>{
   window.linhasExportadas=[];const original=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(texto,x,y,...args){linhasExportadas.push({x,w:this.measureText(texto).width});return original.call(this,texto,x,y,...args);};
 });
 const download=p.waitForEvent('download');await p.locator('#qExportMenu summary').click();await p.locator('#qExportarPagina').click();
 await (await download).saveAs(join(outputDir,'alinhamento.jpg'));
 const exportadas=await p.evaluate(()=>linhasExportadas);assert.equal(exportadas.length,12);
 for(let i=0;i<tipos.length;i++)confere(exportadas.slice(i*2,i*2+2),['left','center','right'][i%3]);
 await seletor('nota').click(); await p.screenshot({path:join(outputDir,'alinhamento.png')});
 const estado=await p.evaluate(()=>Quadro.estado());
 await p.evaluate(s=>Quadro.ver(s),estado);
 for(let i=0;i<tipos.length;i++)confere(await linhas(tipos[i]),['left','center','right'][i%3]);
 console.log('✓ Alinhamento: seis tipos, três posições reais, seleção, edição, desfazer, páginas, recarga, JPEG e visualização ao vivo.');
}
async function testarFontes(browser,errors) {
 const p=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});
 p.on('pageerror',e=>errors.push(e.message)); await setup(p);
 const tipos=['caixa','nota','circulo','losango','triangulo','texto'];
 const nos=tipos.map((tipo,i)=>({id:tipo,tipo,x:60+i%3*300,y:60+Math.floor(i/3)*300,w:220,h:tipo==='caixa'?60:180,texto:tipo==='caixa'?'Caixa':tipo}));
 await p.evaluate(nos=>localStorage.setItem('medida_quadro_v1',JSON.stringify({nos,setas:[],tracos:[],vista:{x:0,y:0,k:1}})),nos); await mount(p);
 const fonte=tipo=>p.locator(`.qn[data-id="${tipo}"] .qt`).evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
 const valor=tipo=>p.evaluate(tipo=>Quadro.estado().nos.find(n=>n.id===tipo),tipo);
 const selecionar=tipo=>p.locator(`.qn[data-id="${tipo}"]`).click();
 async function digitar(n) { await p.locator('#qFonte').fill(String(n)); await p.locator('#qFonte').press('Enter'); }
 assert.equal(await p.locator('#qFonteMais').isDisabled(),true);
 for(const tipo of tipos) {
   await selecionar(tipo);
   const inicial=tipo==='texto'?22:15;
   assert.equal(await fonte(tipo),inicial,'Quadros anteriores conservam o tamanho padrão');
   assert.equal(await p.locator('#qFonte').inputValue(),String(inicial));
   await p.getByRole('button',{name:'Aumentar fonte',exact:true}).click();
   assert.equal(await fonte(tipo),inicial+2);
   await digitar(32); assert.equal(await fonte(tipo),32); assert.equal((await valor(tipo)).fonte,32);
 }
 // Alterar um elemento preserva os demais e aumenta o espaço da forma quando necessário.
 await selecionar('caixa'); await digitar(48);
 assert.equal(await fonte('nota'),32); assert.ok((await valor('caixa')).h>60);
 await p.getByRole('button',{name:'Diminuir fonte',exact:true}).click(); assert.equal(await fonte('caixa'),46);
 await p.locator('#qDesfazer').click(); assert.equal(await fonte('caixa'),48);
 await selecionar('caixa'); await digitar(''); assert.equal(await p.locator('#qFonte').inputValue(),'48');
 await digitar(0); assert.equal(await fonte('caixa'),8); assert.equal(await p.locator('#qFonteMenos').isDisabled(),true);
 await digitar(200); assert.equal(await fonte('caixa'),96); assert.equal(await p.locator('#qFonteMais').isDisabled(),true);
 await digitar(48);
 // O clique no controle de fonte conclui a edição sem perder o texto digitado.
 await p.locator('.qn[data-id="nota"]').dblclick();
 await p.locator('.qn[data-id="nota"] .qt').fill('Texto revisado');
 await p.locator('#qFonteMais').click(); assert.equal((await valor('nota')).texto,'Texto revisado'); assert.equal(await fonte('nota'),34);
 await p.locator('#qDesfazer').click(); assert.equal((await valor('nota')).texto,'Texto revisado'); assert.equal(await fonte('nota'),32);
 await selecionar('caixa'); await p.locator('#qCaneta').click();
 assert.equal(await p.locator('#qFonte').isDisabled(),true);
 await p.locator('#qSelecionar').click(); assert.equal(await p.locator('#qFonte').inputValue(),'48');
 await p.locator('#qNovaPagina').click(); assert.equal(await p.locator('#qFonteMais').isDisabled(),true);
 await p.locator('#qAnterior').click(); assert.equal(await fonte('caixa'),48);
 await p.waitForFunction(()=>document.getElementById('qSalvo').textContent==='Salvo neste navegador');
 await p.reload(); await mount(p); assert.equal(await fonte('caixa'),48); assert.equal(await fonte('nota'),32);
 await p.evaluate(()=>{
   window.fontesExportadas=[];
   const original=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(texto,...args){fontesExportadas.push({texto,fonte:this.font});return original.call(this,texto,...args);};
 });
 const download=p.waitForEvent('download'); await p.locator('#qExportMenu summary').click(); await p.locator('#qExportarPagina').click();
 await (await download).saveAs(join(outputDir,'fontes.jpg'));
 const fontes=await p.evaluate(()=>fontesExportadas);
 assert.ok(fontes.some(f=>f.texto==='Caixa' && /\b48px\b/.test(f.fonte)),'JPEG usa a fonte escolhida');
 assert.ok(fontes.some(f=>/\b32px\b/.test(f.fonte)));
 await selecionar('caixa'); await p.screenshot({path:join(outputDir,'fontes.png')});
 const publico=await p.evaluate(()=>Quadro.estado());
 const viewer=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});
 viewer.on('pageerror',e=>errors.push(e.message)); await setup(viewer); await mount(viewer);
 await viewer.evaluate(s=>Quadro.ver(s),publico);
 assert.equal(await viewer.locator('.qn[data-id="caixa"] .qt').evaluate(e=>getComputedStyle(e).fontSize),'48px');
 console.log('✓ Fontes: seis tipos, aumentar/diminuir, tamanho digitado, limites, altura, edição, desfazer, seleção, páginas, recarga, JPEG e visualização ao vivo.');
}
async function testarConexoes(browser, errors) {
 const p = await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});
 p.on('pageerror',e=>errors.push(e.message)); await setup(p);
 const estado = {
   nos:[{id:'origem',tipo:'caixa',x:400,y:300,w:160,h:80,texto:'Origem'},
        {id:'destino',tipo:'caixa',x:800,y:300,w:160,h:80,texto:'Destino'}],
   setas:[{id:'legada',a:'destino',b:'origem'}],tracos:[],vista:{x:0,y:0,k:1}
 };
 await p.evaluate(s=>localStorage.setItem('medida_quadro_v1',JSON.stringify(s)),estado); await mount(p);
 const menu = p.getByRole('menu',{name:'Criar elemento conectado'});
 const snapshot = () => p.evaluate(()=>JSON.stringify(Quadro.estado()));
 const linha = () => p.locator('#qTemp').evaluate(e=>Object.fromEntries(['x1','y1','x2','y2'].map(k=>[k,Number(e.getAttribute(k))])));
 async function comeca(lado) {
   await p.locator('.qn[data-id="origem"]').click();
   const h = await p.locator(`.qn[data-id="origem"] .qh[data-lado="${lado}"]`).boundingBox();
   await p.mouse.move(h.x+h.width/2,h.y+h.height/2); await p.mouse.down();
 }
 async function moveMundo(x,y) {
   const tela=await p.locator('#qTela').boundingBox(),v=await p.evaluate(()=>Quadro.estado().vista);
   await p.mouse.move(tela.x+v.x+x*v.k,tela.y+v.y+y*v.k,{steps:5});
 }
 assert.equal(await p.locator('.qn[data-id="origem"] .qh').count(),4);
 assert.equal(await p.locator('#qSetas .qs').count(),1,'Conexões antigas continuam funcionando');
 // Arraste para um elemento: a prévia é visível, acompanha o mouse e se fixa ao destino.
 await comeca('direita'); await moveMundo(700,240);
 assert.equal(await p.locator('#qTemp').isVisible(),true);
 const previa = await linha(); assert.equal(previa.x1,560); assert.equal(previa.y1,340);
 assert.ok(Math.abs(previa.x2-700)<2 && Math.abs(previa.y2-240)<2);
 await p.screenshot({path:join(outputDir,'conexao-arrastando.png')});
 await moveMundo(880,340); assert.equal(await p.locator('.qn.q-alvo[data-id="destino"]').count(),1);
 await p.mouse.up(); assert.equal(await menu.isVisible(),false);
 const ligacao = await p.evaluate(()=>Quadro.estado().setas.find(s=>s.a==='origem'));
 assert.equal(ligacao.b,'destino'); assert.equal(ligacao.ladoA,'direita'); assert.equal(ligacao.ladoB,'esquerda');
 assert.equal(await p.locator('#qSetas .qs').count(),2);
 // Nem uma segunda ligação idêntica nem soltar sobre o próprio nó altera o desenho.
 const conectado = await snapshot();
 await comeca('direita'); await moveMundo(880,340); await p.mouse.up(); assert.equal(await snapshot(),conectado);
 await comeca('topo'); await moveMundo(480,340); await p.mouse.up(); assert.equal(await snapshot(),conectado);
 await p.locator('#qDesfazer').click(); assert.equal(await p.locator('#qSetas .qs').count(),1);
 const antes = await snapshot();
 const escolhas = [
   ['topo',480,160,'Caixa','caixa'],['direita',700,340,'Círculo','circulo'],
   ['baixo',480,570,'Losango','losango'],['esquerda',200,340,'Triângulo','triangulo'],
   ['topo',480,160,'Nota','nota'],['baixo',480,570,'Texto','texto']
 ];
 for(const [lado,x,y,nome,tipo] of escolhas) {
   await comeca(lado); await moveMundo(x,y); await p.mouse.up();
   assert.equal(await menu.isVisible(),true);
   assert.equal(await p.locator('#qTemp').evaluate(e=>!e.hasAttribute('hidden') && getComputedStyle(e).display!=='none'),true);
   assert.equal(await menu.getByRole('menuitem').count(),35);
   assert.equal(await snapshot(),antes,'Abrir o menu ainda não deve criar elementos');
   if(tipo==='circulo') await p.screenshot({path:join(outputDir,'conexao-menu.png')});
   await menu.getByRole('menuitem',{name:nome,exact:true}).click();
   const s = await p.evaluate(()=>Quadro.estado()), n=s.nos.at(-1), seta=s.setas.at(-1);
   assert.equal(n.tipo,tipo); assert.equal(seta.a,'origem'); assert.equal(seta.b,n.id); assert.equal(seta.ladoA,lado);
   assert.equal(await p.locator(`.qn[data-id="${n.id}"] .qh`).count(),4);
   const box=await p.locator(`.qn[data-id="${n.id}"]`).evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight}));
   assert.ok(Math.abs(n.x+box.w/2-x)<2 && Math.abs(n.y+box.h/2-y)<2,'Novo elemento fica onde a linha foi solta');
   assert.equal(await menu.isVisible(),false);
   await p.locator('#qDesfazer').click(); assert.equal(await snapshot(),antes,'Desfazer remove o elemento e sua conexão juntos');
 }
 // Cancelar, Esc, clique fora e pointercancel não deixam conexões ou nós soltos.
 await comeca('topo'); await moveMundo(480,160); await p.mouse.up();
 await menu.getByRole('menuitem',{name:'Cancelar · Esc',exact:true}).click(); assert.equal(await snapshot(),antes);
 await comeca('esquerda'); await moveMundo(200,340); await p.mouse.up(); await p.keyboard.press('Escape');
 assert.equal(await menu.isVisible(),false); assert.equal(await p.locator('#qTemp').isVisible(),false); assert.equal(await snapshot(),antes);
 await comeca('topo'); await moveMundo(480,160); await p.keyboard.press('Escape'); await p.mouse.up();
 assert.equal(await menu.isVisible(),false); assert.equal(await snapshot(),antes);
 await comeca('topo'); await moveMundo(480,160);
 await p.locator('#qTela').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'}); await p.mouse.up();
 assert.equal(await menu.isVisible(),false); assert.equal(await snapshot(),antes);
 await comeca('topo'); await moveMundo(480,160); await p.mouse.up(); await p.locator('#qSelecionar').click();
 assert.equal(await menu.isVisible(),false); assert.equal(await snapshot(),antes);
 // Foco, zoom e pan: coordenadas de criação continuam no ponto da soltura.
 await p.locator('#qFoco').click();
 await comeca('direita'); await moveMundo(700,340); await p.mouse.up(); await p.keyboard.press('Escape');
 assert.equal(await p.locator('body.q-foco').count(),1,'Esc fecha primeiro o menu, conservando o modo só quadro');
 await p.keyboard.press('Escape');
 await p.locator('#qMais').click();
 await p.locator('#qTela').dispatchEvent('wheel',{deltaX:40,deltaY:60});
 const v=await p.evaluate(()=>Quadro.estado().vista);
 await comeca('topo'); await moveMundo(480,160); await p.mouse.up();
 await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
 const persistido=await p.evaluate(()=>Quadro.estado());
 assert.equal(persistido.nos.at(-1).tipo,'circulo'); assert.deepEqual(persistido.vista,v);
 const novo=persistido.nos.at(-1);
 assert.ok(Math.abs(novo.x+70-480)<2 && Math.abs(novo.y+70-160)<2);
 await p.locator('#qSelecionar').click();
 // As âncoras seguem o movimento e o redimensionamento e sobrevivem à recarga.
 const origem = p.locator('.qn[data-id="origem"]');
 const r=await origem.boundingBox(); await p.mouse.move(r.x+r.width/2,r.y+r.height/2); await p.mouse.down();
 await p.mouse.move(r.x+r.width/2+36,r.y+r.height/2+24); await p.mouse.up();
 const resize=await origem.locator('.qr').boundingBox(); await p.mouse.move(resize.x+7,resize.y+7); await p.mouse.down();
 await p.mouse.move(resize.x+37,resize.y+27); await p.mouse.up();
 const ancora=await p.locator('#qSetas .qs').last().locator('.vis').evaluate(e=>({x:Number(e.getAttribute('x1')),y:Number(e.getAttribute('y1'))}));
 const no=await p.evaluate(()=>Quadro.estado().nos.find(n=>n.id==='origem'));
 assert.ok(Math.abs(ancora.x-(no.x+no.w/2))<2 && Math.abs(ancora.y-no.y)<2);
 await p.waitForFunction(()=>document.getElementById('qSalvo').textContent==='Salvo neste navegador');
 const final=await snapshot(); await p.reload(); await mount(p); assert.equal(await snapshot(),final);
 const download=p.waitForEvent('download'); await p.locator('#qExportMenu summary').click(); await p.locator('#qExportarPagina').click();
 await (await download).saveAs(join(outputDir,'conexoes.jpg'));
 await p.screenshot({path:join(outputDir,'conexoes.png')});
 console.log('✓ Conexões: quatro lados, prévia ao arrastar, ligação direta, criação dos seis tipos, desfazer, cancelamentos, teclado, modo foco, zoom/pan, âncoras, recarga e JPEG.');
}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);await page.evaluate(s=>localStorage.setItem('medida_quadro_v1',JSON.stringify(s)),legacy);await mount(page);
 const first=(await page.evaluate(()=>Quadro.estado())).pagina;assert.equal(await page.locator('#qPagina option').count(),1);assert.equal(await page.locator('#qTinta path').count(),1);
 await draw(page,'Azul');await page.locator('#qNovaPagina').click();const second=(await page.evaluate(()=>Quadro.estado())).pagina;assert.notEqual(first,second);assert.equal(await page.locator('#qTinta path').count(),0);assert.equal(await page.locator('.qn').count(),0);
 await draw(page,'Vermelho',380);await page.locator('#qAnterior').click();assert.equal(await page.locator('#qTinta path').count(),2);await page.locator('#qDesfazer').click();assert.equal(await page.locator('#qTinta path').count(),1);await page.locator('#qProxima').click();assert.equal(await page.locator('#qTinta path').count(),1);assert.equal(await page.evaluate(()=>Quadro.estado().tracos[0].cor),'#dc2626');
 // Um pacote atrasado pertence à primeira página, mesmo com a segunda aberta.
 await page.evaluate(id=>Quadro.addTraco('late',{p:[50,400,300,400],w:5,cor:'#2563eb',pagina:id}),first);assert.equal(await page.locator('#qTinta path').count(),1);
 await page.waitForTimeout(350);await page.reload();await mount(page);assert.equal(await page.locator('#qPagina option').count(),2);assert.equal((await page.evaluate(()=>Quadro.estado())).pagina,second);await page.locator('#qAnterior').click();assert.equal(await page.locator('#qTinta path').count(),2);await page.locator('#qProxima').click();
 // Limpar e desfazer afetam só a página atual.
 page.once('dialog',d=>d.accept());await page.locator('#qMaisMenu summary').click();await page.locator('#qLimpar').click();assert.equal(await page.locator('#qTinta path').count(),0);await page.locator('#qDesfazer').click();assert.equal(await page.locator('#qTinta path').count(),1);
 await page.locator('#qFoco').click();assert.equal(await page.locator('.q-paginas').isVisible(),false);await page.keyboard.press('PageUp');assert.equal((await page.evaluate(()=>Quadro.estado())).pagina,first);await page.keyboard.press('PageDown');await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>Quadro.estado())).pagina,second);
 const snap=await page.evaluate(()=>JSON.stringify(Quadro.estado()));
 const one=page.waitForEvent('download');await page.locator('#qExportMenu summary').click();await page.locator('#qExportarPagina').click();const jpg=await one;assert.equal(jpg.suggestedFilename(),'quadro-pagina-02.jpg');await jpg.saveAs(join(outputDir, 'pagina-02.jpg'));
 const all=page.waitForEvent('download');await page.locator('#qExportMenu summary').click();await page.locator('#qExportarTudo').click();const zip=await all;assert.equal(zip.suggestedFilename(),'quadro-paginas.zip');await zip.saveAs(join(outputDir, 'paginas.zip'));assert.equal(await page.evaluate(()=>JSON.stringify(Quadro.estado())),snap);
 const bytes=fs.readFileSync(join(outputDir,'paginas.zip')), nomes=[]; let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){const size=bytes.readUInt32LE(offset+18), nameLen=bytes.readUInt16LE(offset+26), extraLen=bytes.readUInt16LE(offset+28);nomes.push(bytes.toString('utf8',offset+30,offset+30+nameLen));const start=offset+30+nameLen+extraLen;assert.equal(bytes.readUInt16BE(start),0xffd8);assert.equal(bytes.readUInt16BE(start+size-2),0xffd9);offset=start+size;}
 assert.deepEqual(nomes,['quadro-pagina-01.jpg','quadro-pagina-02.jpg']);assert.equal(bytes.readUInt32LE(offset),0x02014b50);
 console.log('✓ Páginas: migração, navegação, cores, histórico isolado, pacote atrasado, recarga, limpar/desfazer, modo foco e downloads.');
 // Cores dos elementos: interação real, contraste, desfazer, persistência e JPEG.
 const colorPage = await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});
 colorPage.on('pageerror', e => errors.push(e.message));
 await setup(colorPage);
 const tipos = ['caixa','nota','circulo','losango','triangulo','texto'];
 const paleta = ['#2563eb','#dc2626','#15803d','#c2410c','#9333ea','#2563eb'];
 const nomesCores = ['Azul','Vermelho','Verde','Laranja','Roxo','Azul'];
 const elementos = tipos.map((tipo,i) => ({id:tipo,tipo,x:70+i%3*300,y:70+Math.floor(i/3)*230,w:200,h:160,texto:tipo}));
 await colorPage.evaluate(nos => localStorage.setItem('medida_quadro_v1',JSON.stringify({nos,setas:[],tracos:[],vista:{x:0,y:0,k:1}})),elementos);
 await mount(colorPage);
 const estilo = (p,tipo) => p.locator(`.qn[data-id="${tipo}"]`).evaluate(e => ({
   fundo:getComputedStyle(e.querySelector('polygon') || e)[e.querySelector('polygon') ? 'fill' : 'backgroundColor'],
   texto:getComputedStyle(e.querySelector('.qt')).color
 }));
 for (let i=0;i<tipos.length;i++) {
   await colorPage.locator(`.qn[data-id="${tipos[i]}"]`).click();
   await colorPage.getByRole('button',{name:nomesCores[i],exact:true}).click();
   const estado = await colorPage.evaluate(() => Quadro.estado());
   assert.equal(estado.nos[i].cor,paleta[i]);
   assert.equal(await colorPage.locator('#qSelecionar').getAttribute('aria-pressed'),'true');
   assert.equal(await colorPage.locator('.qn.sel').getAttribute('data-id'),tipos[i]);
   assert.equal(await colorPage.getByRole('group',{name:'Cor de fundo do elemento selecionado'}).count(),1);
 }
 // Cada forma usa o preenchimento completo e conserva o contraste nos dois temas.
 for (const tema of ['light','dark']) {
   await colorPage.evaluate(tema => document.documentElement.dataset.theme=tema,tema);
   for (let i=0;i<tipos.length;i++) {
     const rgb = paleta[i].slice(1).match(/../g).map(x=>parseInt(x,16));
     assert.deepEqual(await estilo(colorPage,tipos[i]),{fundo:`rgb(${rgb.join(', ')})`,texto:'rgb(255, 255, 255)'});
   }
 }
 await colorPage.locator('.qn[data-id="nota"]').click();
 assert.equal(await colorPage.getByRole('button',{name:'Vermelho',exact:true}).getAttribute('aria-pressed'),'true');
 await colorPage.getByRole('button',{name:'Cor padrão do tema',exact:true}).click();
 assert.equal(await colorPage.evaluate(() => Quadro.estado().nos.find(n=>n.id==='nota').cor),undefined);
 assert.notEqual((await estilo(colorPage,'nota')).fundo,'rgb(220, 38, 38)');
 await colorPage.locator('#qDesfazer').click();
 assert.equal((await estilo(colorPage,'nota')).fundo,'rgb(220, 38, 38)');
 // Ao terminar a edição pelo clique na paleta, conserva também o texto digitado.
 await colorPage.locator('.qn[data-id="caixa"]').dblclick();
 await colorPage.locator('.qn[data-id="caixa"] .qt').fill('Caixa azul');
 await colorPage.getByRole('button',{name:'Verde',exact:true}).click();
 assert.equal(await colorPage.locator('.qn[data-id="caixa"] .qt').textContent(),'Caixa azul');
 await colorPage.locator('#qDesfazer').click();
 assert.equal((await estilo(colorPage,'caixa')).fundo,'rgb(37, 99, 235)');
 assert.equal(await colorPage.locator('.qn[data-id="caixa"] .qt').textContent(),'Caixa azul');
 // A cor da caneta continua independente, mesmo com um elemento selecionado.
 await colorPage.locator('.qn[data-id="texto"]').click();
 const antesCaneta = await colorPage.evaluate(() => JSON.stringify(Quadro.estado().nos));
 await colorPage.locator('#qCaneta').click();
 await draw(colorPage,'Laranja',600);
 assert.equal(await colorPage.evaluate(() => JSON.stringify(Quadro.estado().nos)),antesCaneta);
 assert.equal(await colorPage.evaluate(() => Quadro.estado().tracos.at(-1).cor),'#c2410c');
 await colorPage.locator('#qSelecionar').click();
 assert.equal(await colorPage.getByRole('button',{name:'Azul',exact:true}).getAttribute('aria-pressed'),'true');
 await colorPage.locator('#qNovaPagina').click();
 await colorPage.locator('#qAnterior').click();
 assert.deepEqual(await colorPage.evaluate(() => Quadro.estado().nos.map(n=>n.cor)),paleta);
 await colorPage.waitForFunction(() => document.getElementById('qSalvo').textContent==='Salvo neste navegador');
 await colorPage.reload(); await mount(colorPage);
 assert.deepEqual(await colorPage.evaluate(() => Quadro.estado().nos.map(n=>n.cor)),paleta);
 const colorDownload = colorPage.waitForEvent('download');
 await colorPage.locator('#qExportMenu summary').click();
 await colorPage.locator('#qExportarPagina').click();
 const colorJpeg = await colorDownload;
 await colorJpeg.saveAs(join(outputDir,'elementos-coloridos.jpg'));
 const contagens = await colorPage.evaluate(async ({base64,cores}) => {
   const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
   const img=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));
   const canvas=document.createElement('canvas'); canvas.width=img.width; canvas.height=img.height;
   const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   return cores.map(cor=>{
     const rgb=cor.slice(1).match(/../g).map(h=>parseInt(h,16));let total=0;
     for(let i=0;i<pixels.length;i+=4)if(rgb.every((c,j)=>Math.abs(c-pixels[i+j])<10))total++;
     return total;
   });
 },{base64:fs.readFileSync(join(outputDir,'elementos-coloridos.jpg')).toString('base64'),cores:paleta});
 contagens.forEach(total=>assert.ok(total>1000,'JPEG deve preservar o preenchimento dos elementos'));
 await colorPage.screenshot({path:join(outputDir,'elementos-coloridos.png')});
 const estadoColorido = await colorPage.evaluate(() => Quadro.estado());
 // O mesmo estado público que a sala transmite é reproduzido por quem assiste.
 const viewer = await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});
 viewer.on('pageerror',e=>errors.push(e.message)); await setup(viewer); await mount(viewer);
 await viewer.evaluate(estado=>Quadro.ver(estado),estadoColorido);
 for (const tipo of tipos) assert.deepEqual(await estilo(viewer,tipo),await estilo(colorPage,tipo));
 console.log('✓ Elementos: seis tipos, preenchimento exato, contraste nos dois temas, seleção, restauração, desfazer, edição, caneta independente, páginas, recarga, JPEG e visualização ao vivo.');
 await testarFontes(browser,errors);
 await testarAlinhamento(browser,errors);
 await testarVertical(browser,errors);
 const estrategia=await testarElementos(browser,errors);
 await testarConexoes(browser,errors);
 // Tablet segue a página, encerra um traço em curso na página correta e limita limpar/desfazer.
 const tablet=await browser.newPage({viewport:{width:1024,height:768},colorScheme:'dark'});tablet.on('pageerror',e=>errors.push(e.message));await tablet.addInitScript(()=>{window.sent=[];window.removed=[];window.erasers=[];let key=0;window.Sala={disponivel:true,tablet:async()=>({novaChave:()=>String(++key),gravar:async(k,t)=>sent.push({id:k,p:[...t.p],w:t.w,cor:t.cor,pagina:t.pagina}),apagar:async k=>removed.push(k),borracha:async(p,r,pagina)=>erasers.push({p,r,pagina}),aoVivo:cb=>window.receiveVista=cb}),ouvirQuadro:(_,cb)=>window.receive=cb};});await setup(tablet,'tablet.html');await tablet.waitForFunction(()=>window.receive);
 const a={nos:estadoColorido.nos.map(n=>({...n,fonte:32,alinhamento:'right',vertical:'bottom'})).concat(estrategia.nos.find(n=>n.elemento==='instagram')),setas:[],tracos:[],pagina:first,numeroPagina:1,totalPaginas:2,area:{x:0,y:0,w:1024,h:768,pagina:first}};const b={...a,pagina:second,numeroPagina:2,area:{...a.area,pagina:second}};
 await tablet.evaluate(a=>receive(a),a);assert.deepEqual(await estilo(tablet,'triangulo'),await estilo(colorPage,'triangulo'));assert.equal(await tablet.locator('.qn[data-id="triangulo"] .qt').evaluate(e=>getComputedStyle(e).fontSize),'32px');assert.equal(await tablet.locator('.qn[data-id="triangulo"] .qt').evaluate(e=>getComputedStyle(e).textAlign),'right');assert.equal(await tablet.locator('.qn[data-id="triangulo"]').evaluate(e=>getComputedStyle(e).alignItems),'flex-end');await tablet.getByRole('button',{name:'Azul',exact:true}).click();await tablet.mouse.move(100,400);await tablet.mouse.down();await tablet.mouse.move(300,400);await tablet.evaluate(b=>receive(b),b);await tablet.mouse.up();assert.equal(await tablet.evaluate(()=>sent.at(-1).pagina),first);assert.equal(await tablet.locator('#desf').isDisabled(),true);
 await tablet.getByRole('button',{name:'Vermelho',exact:true}).click();await tablet.mouse.move(100,400);await tablet.mouse.down();await tablet.mouse.move(300,400);await tablet.mouse.up();assert.equal(await tablet.evaluate(()=>sent.at(-1).pagina),second);await tablet.locator('#limpa').click();assert.deepEqual(await tablet.evaluate(()=>removed),['2']);
 await tablet.evaluate(a=>receive(a),a);assert.equal(await tablet.locator('#desf').isDisabled(),false);await tablet.locator('#desf').click();assert.deepEqual(await tablet.evaluate(()=>removed),['2','1']);assert.match(await tablet.locator('#mPagina').textContent(),/Página 1 de 2/);
 assert.equal(await tablet.locator('.qn.estrategia .q-simbolo').count(),1);
 await page.screenshot({path:join(outputDir, 'interface.png')});assert.deepEqual(errors,[]);console.log('✓ Tablet: troca durante desenho, identificação de página, limpar/desfazer isolados, indicador de página e elementos estratégicos.');
 console.log('Artefatos de verificação: '+outputDir);
}finally{await browser.close();}})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
