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
 else if(['/css/style.css','/js/quadro.js'].includes(p)){body=fs.readFileSync(ROOT+p,'utf8');contentType=p.endsWith('.css')?'text/css':'text/javascript';}
 else return route.fulfill({status:204,body:''});return route.fulfill({contentType,body});});
 await page.goto('http://quadro.test/'+file+(file==='app.html'?'#/quadro':'#s=test&k=test'));
}
const legacy={nos:[{id:'box',tipo:'caixa',x:150,y:120,w:200,h:80,texto:'Página original'},{id:'note',tipo:'nota',x:430,y:180,w:170,h:110,texto:'Anotações\nDuas linhas'},{id:'tri',tipo:'triangulo',x:750,y:210,w:180,h:150,texto:'Triângulo'},{id:'txt',tipo:'texto',x:-450,y:-150,texto:'Fora da vista'}],setas:[{id:'s',a:'box',b:'note'}],tracos:[{id:'legacy',p:[0,0,100,0],w:3}],vista:{x:0,y:0,k:1}};
async function mount(page){for(const f of ['js/quadro-exportar.js','js/quadro.js'])await page.addScriptTag({content:fs.readFileSync(f,'utf8')});await page.evaluate(()=>{document.getElementById('boot').remove();for(const id of ['authWrap','topAuth'])document.getElementById(id).hidden=true;for(const id of ['shell','quadro'])document.getElementById(id).hidden=false;document.querySelector('main.page').classList.add('larga');Quadro.abrir();});}
async function draw(page,color,y=450){await page.getByRole('button',{name:color,exact:true}).click();const r=await page.locator('#qTela').boundingBox();await page.mouse.move(r.x+120,r.y+y);await page.mouse.down();await page.mouse.move(r.x+350,r.y+y);await page.mouse.up();}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'dark',acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);await page.evaluate(s=>localStorage.setItem('medida_quadro_v1',JSON.stringify(s)),legacy);await mount(page);
 const first=(await page.evaluate(()=>Quadro.estado())).pagina;assert.equal(await page.locator('#qPagina option').count(),1);assert.equal(await page.locator('#qTinta path').count(),1);
 await draw(page,'Azul');await page.locator('#qNovaPagina').click();const second=(await page.evaluate(()=>Quadro.estado())).pagina;assert.notEqual(first,second);assert.equal(await page.locator('#qTinta path').count(),0);assert.equal(await page.locator('.qn').count(),0);
 await draw(page,'Vermelho',380);await page.locator('#qAnterior').click();assert.equal(await page.locator('#qTinta path').count(),2);await page.locator('#qDesfazer').click();assert.equal(await page.locator('#qTinta path').count(),1);await page.locator('#qProxima').click();assert.equal(await page.locator('#qTinta path').count(),1);assert.equal(await page.evaluate(()=>Quadro.estado().tracos[0].cor),'#dc2626');
 // Um pacote atrasado pertence à primeira página, mesmo com a segunda aberta.
 await page.evaluate(id=>Quadro.addTraco('late',{p:[50,400,300,400],w:5,cor:'#2563eb',pagina:id}),first);assert.equal(await page.locator('#qTinta path').count(),1);
 await page.waitForTimeout(350);await page.reload();await mount(page);assert.equal(await page.locator('#qPagina option').count(),2);assert.equal((await page.evaluate(()=>Quadro.estado())).pagina,second);await page.locator('#qAnterior').click();assert.equal(await page.locator('#qTinta path').count(),2);await page.locator('#qProxima').click();
 // Limpar e desfazer afetam só a página atual.
 page.once('dialog',d=>d.accept());await page.locator('#qLimpar').click();assert.equal(await page.locator('#qTinta path').count(),0);await page.locator('#qDesfazer').click();assert.equal(await page.locator('#qTinta path').count(),1);
 await page.locator('#qFoco').click();assert.equal(await page.locator('.q-paginas').isVisible(),false);await page.keyboard.press('PageUp');assert.equal((await page.evaluate(()=>Quadro.estado())).pagina,first);await page.keyboard.press('PageDown');await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>Quadro.estado())).pagina,second);
 const snap=await page.evaluate(()=>JSON.stringify(Quadro.estado()));
 const one=page.waitForEvent('download');await page.locator('#qExportarPagina').click();const jpg=await one;assert.equal(jpg.suggestedFilename(),'quadro-pagina-02.jpg');await jpg.saveAs(join(outputDir, 'pagina-02.jpg'));
 const all=page.waitForEvent('download');await page.locator('#qExportarTudo').click();const zip=await all;assert.equal(zip.suggestedFilename(),'quadro-paginas.zip');await zip.saveAs(join(outputDir, 'paginas.zip'));assert.equal(await page.evaluate(()=>JSON.stringify(Quadro.estado())),snap);
 const bytes=fs.readFileSync(join(outputDir,'paginas.zip')), nomes=[]; let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){const size=bytes.readUInt32LE(offset+18), nameLen=bytes.readUInt16LE(offset+26), extraLen=bytes.readUInt16LE(offset+28);nomes.push(bytes.toString('utf8',offset+30,offset+30+nameLen));const start=offset+30+nameLen+extraLen;assert.equal(bytes.readUInt16BE(start),0xffd8);assert.equal(bytes.readUInt16BE(start+size-2),0xffd9);offset=start+size;}
 assert.deepEqual(nomes,['quadro-pagina-01.jpg','quadro-pagina-02.jpg']);assert.equal(bytes.readUInt32LE(offset),0x02014b50);
 console.log('✓ Páginas: migração, navegação, cores, histórico isolado, pacote atrasado, recarga, limpar/desfazer, modo foco e downloads.');
 // Tablet segue a página, encerra um traço em curso na página correta e limita limpar/desfazer.
 const tablet=await browser.newPage({viewport:{width:1024,height:768},colorScheme:'dark'});tablet.on('pageerror',e=>errors.push(e.message));await tablet.addInitScript(()=>{window.sent=[];window.removed=[];window.erasers=[];let key=0;window.Sala={disponivel:true,tablet:async()=>({novaChave:()=>String(++key),gravar:async(k,t)=>sent.push({id:k,p:[...t.p],w:t.w,cor:t.cor,pagina:t.pagina}),apagar:async k=>removed.push(k),borracha:async(p,r,pagina)=>erasers.push({p,r,pagina}),aoVivo:cb=>window.receiveVista=cb}),ouvirQuadro:(_,cb)=>window.receive=cb};});await setup(tablet,'tablet.html');await tablet.waitForFunction(()=>window.receive);
 const a={nos:[],setas:[],tracos:[],pagina:first,numeroPagina:1,totalPaginas:2,area:{x:0,y:0,w:1024,h:768,pagina:first}};const b={...a,pagina:second,numeroPagina:2,area:{...a.area,pagina:second}};
 await tablet.evaluate(a=>receive(a),a);await tablet.getByRole('button',{name:'Azul',exact:true}).click();await tablet.mouse.move(100,400);await tablet.mouse.down();await tablet.mouse.move(300,400);await tablet.evaluate(b=>receive(b),b);await tablet.mouse.up();assert.equal(await tablet.evaluate(()=>sent.at(-1).pagina),first);assert.equal(await tablet.locator('#desf').isDisabled(),true);
 await tablet.getByRole('button',{name:'Vermelho',exact:true}).click();await tablet.mouse.move(100,400);await tablet.mouse.down();await tablet.mouse.move(300,400);await tablet.mouse.up();assert.equal(await tablet.evaluate(()=>sent.at(-1).pagina),second);await tablet.locator('#limpa').click();assert.deepEqual(await tablet.evaluate(()=>removed),['2']);
 await tablet.evaluate(a=>receive(a),a);assert.equal(await tablet.locator('#desf').isDisabled(),false);await tablet.locator('#desf').click();assert.deepEqual(await tablet.evaluate(()=>removed),['2','1']);assert.match(await tablet.locator('#mPagina').textContent(),/Página 1 de 2/);
 await page.screenshot({path:join(outputDir, 'interface.png')});assert.deepEqual(errors,[]);console.log('✓ Tablet: troca durante desenho, identificação de página, limpar/desfazer isolados e indicador de página.');
 console.log('Artefatos de verificação: '+outputDir);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
