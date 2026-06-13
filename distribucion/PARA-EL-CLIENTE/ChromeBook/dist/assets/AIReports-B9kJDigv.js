import{r as m,b as $,j as a,a2 as L,J as _,K as T,S as k,h as q,i as G,k as V,l as b,B as I,L as ce,Q as B,M as U,N as H,C as de,V as me,q as pe,O as z,a3 as J,a4 as ue}from"./index-Bg6Uc3W0.js";import{T as fe}from"./textarea-B1ExSSsj.js";import{C as xe}from"./CompanyHeader-C58Jmshh.js";import{P as he}from"./PrintButton-Vghhy5h9.js";import{S as ge}from"./square-pen-BYzKqSfq.js";import{s as je}from"./subMonths-D9LQ3BIp.js";import"./index-DRN9-KOX.js";import"./chevron-right-Bh8RisRI.js";import"./circle-BdyLDQO5.js";import"./printer-Bzpx7Ts9.js";import"./file-down-_CdT0oO3.js";const K=[{value:"ejecutivo",label:"📊 Informe Ejecutivo Mensual",desc:"Resumen completo de facturación, clientes y operaciones"},{value:"cliente",label:"👤 Análisis de Cliente",desc:"Informe detallado de un cliente con recomendaciones"},{value:"tecnico",label:"🔧 Informe Técnico SAT/Mantenimiento",desc:"Análisis de órdenes y fichas de mantenimiento"},{value:"financiero",label:"💶 Informe Financiero",desc:"Análisis de ingresos, cobros y morosidad"},{value:"stock",label:"📦 Informe de Inventario",desc:"Estado del stock y necesidades de reposición"}];function Ee(){const[c,Q]=m.useState("ejecutivo"),[u,Y]=m.useState(""),[N,W]=m.useState("3"),[E,O]=m.useState(!1),[p,v]=m.useState(null),[S,X]=m.useState(!1),[C,R]=m.useState([]),[P,Z]=m.useState([]),[ee,w]=m.useState(!0),[te,ae]=m.useState({}),F=m.useRef(null);m.useEffect(()=>{se();const s=localStorage.getItem("ai_reports_history");s&&R(JSON.parse(s).slice(0,10))},[]);const se=async()=>{w(!0);const[s,h,y,l,f,x,g]=await Promise.all([$.entities.Contact.list("name",500),$.entities.Invoice.list("-date",1e3),$.entities.SATOrder.list("-date",500),$.entities.MaintenanceSheet.list("-date",500),$.entities.StockItem.list("name",300),$.entities.Project.list("-created_date",200),$.entities.Appointment.list("-date",200)]);Z(s),ae({invoices:h,sat:y,maintenance:l,stock:f,projects:x,appointments:g,contacts:s}),w(!1)},ne=()=>{var D,M;const s=parseInt(N),h=je(new Date,s),{invoices:y=[],sat:l=[],maintenance:f=[],stock:x=[],projects:g=[],appointments:ie=[],contacts:j=[]}=te,d=y.filter(e=>{try{return J(e.date)>=h}catch{return!1}});if(c==="cliente"&&u){const e=j.find(i=>i.id===u),n=y.filter(i=>i.contact_id===u),o=l.filter(i=>i.contact_id===u),t=f.filter(i=>i.contact_id===u),r=ie.filter(i=>i.contact_id===u),re=n.filter(i=>i.doc_type==="factura").reduce((i,A)=>i+(A.total||0),0),le=n.filter(i=>["enviado","vencido"].includes(i.status)).reduce((i,A)=>i+(A.total||0),0);return`Eres el analista CRM de una empresa de instalaciones técnicas en España. Genera un informe profesional y detallado sobre este cliente.

DATOS DEL CLIENTE:
- Nombre: ${e==null?void 0:e.name} ${(e==null?void 0:e.surname)||""}
- Empresa: ${(e==null?void 0:e.company_name)||"-"}
- Tipo: ${e==null?void 0:e.type} | Categoría: ${(D=e==null?void 0:e.category)==null?void 0:D.replace(/_/g," ")}
- NIF: ${(e==null?void 0:e.nif)||"-"} | Tel: ${(e==null?void 0:e.phone)||"-"} | Email: ${(e==null?void 0:e.email)||"-"}
- Dirección: ${(e==null?void 0:e.address)||"-"}, ${(e==null?void 0:e.city)||"-"} ${(e==null?void 0:e.province)||"-"}
- Perfil de pago: ${e==null?void 0:e.payment_profile} | Importe pendiente: ${(e==null?void 0:e.pending_amount)||0} €
- Observaciones internas: ${(e==null?void 0:e.internal_observations)||"Ninguna"}

HISTORIAL COMERCIAL:
- Facturas totales: ${n.filter(i=>i.doc_type==="factura").length} | Total facturado: ${re.toFixed(2)} €
- Presupuestos: ${n.filter(i=>i.doc_type==="presupuesto").length}
- Pendiente de cobro: ${le.toFixed(2)} €
- Última factura: ${((M=n[0])==null?void 0:M.date)||"N/D"}
- Órdenes SAT: ${o.length} (${o.filter(i=>i.status==="pendiente").length} pendientes, ${o.filter(i=>i.status==="completada").length} completadas)
- Fichas mantenimiento: ${t.length}
- Citas: ${r.length}

TIPOS DE TRABAJO SAT: ${[...new Set(o.map(i=>i.type))].join(", ")||"-"}
EQUIPOS MANTENIDOS: ${[...new Set(t.map(i=>`${i.equipment_brand} ${i.equipment_model}`).filter(Boolean))].join(", ")||"-"}

Genera un informe estructurado con:
1. **Resumen ejecutivo del cliente** (valoración general)
2. **Análisis comercial** (facturación, tendencia, rentabilidad)
3. **Historial técnico** (equipos, trabajos realizados)
4. **Situación financiera** (pagos, pendientes, riesgo)
5. **Oportunidades de negocio** (qué servicios podríamos ofrecerle)
6. **Recomendaciones de acción** (próximos pasos concretos)
7. **Valoración global** (semáforo: 🔴 Problemático / 🟡 Neutro / 🟢 Excelente)`}if(c==="ejecutivo"){const e=d.filter(t=>t.doc_type==="factura").reduce((t,r)=>t+(r.total||0),0),n=d.filter(t=>t.status==="pagado").reduce((t,r)=>t+(r.total||0),0),o=d.filter(t=>["enviado","vencido"].includes(t.status)).reduce((t,r)=>t+(r.total||0),0);return`Eres el analista financiero y de negocio de una empresa de instalaciones técnicas en España. Genera un informe ejecutivo mensual completo.

PERÍODO DE ANÁLISIS: Últimos ${s} meses

FACTURACIÓN:
- Total facturado: ${e.toFixed(2)} €
- Total cobrado: ${n.toFixed(2)} €
- Tasa de cobro: ${e>0?Math.round(n/e*100):0}%
- Pendiente de cobro: ${o.toFixed(2)} €
- Facturas vencidas: ${d.filter(t=>t.status==="vencido").length}
- Presupuestos emitidos: ${d.filter(t=>t.doc_type==="presupuesto").length} por ${d.filter(t=>t.doc_type==="presupuesto").reduce((t,r)=>t+(r.total||0),0).toFixed(2)} €

CLIENTES:
- Total en base de datos: ${j.length}
- Clientes activos: ${j.filter(t=>t.type==="cliente").length}
- Morosos: ${j.filter(t=>t.payment_profile==="moroso").length}
- Mal pagadores: ${j.filter(t=>t.payment_profile==="mal_pagador").length}

OPERACIONES:
- SAT completadas: ${l.filter(t=>t.status==="completada").length}
- SAT pendientes: ${l.filter(t=>t.status==="pendiente").length}
- SAT en curso: ${l.filter(t=>t.status==="en_curso").length}
- Fichas mantenimiento: ${f.length}
- Proyectos en curso: ${g.filter(t=>t.status==="en_curso").length}
- Proyectos vencidos: ${g.filter(t=>t.end_date&&t.end_date<z(new Date,"yyyy-MM-dd")&&!["completado","cancelado"].includes(t.status)).length}

TIPOS DE TRABAJO SAT (top): ${Object.entries(l.reduce((t,r)=>(t[r.type]=(t[r.type]||0)+1,t),{})).sort((t,r)=>r[1]-t[1]).slice(0,3).map(([t,r])=>`${t}:${r}`).join(", ")}

Genera un informe ejecutivo completo con:
1. **Resumen ejecutivo** (KPIs clave con semáforo)
2. **Análisis de facturación** (tendencia, cobros, morosidad)
3. **Análisis de clientes** (captación, retención, riesgos)
4. **Rendimiento operacional** (SAT, mantenimientos, proyectos)
5. **Puntos fuertes y débiles**
6. **Recomendaciones estratégicas** (acciones concretas)
7. **Objetivos para el próximo período**`}if(c==="tecnico")return`Eres el director técnico de una empresa de instalaciones técnicas. Genera un informe técnico operacional.

PERÍODO: Últimos ${s} meses

SAT - SERVICIO TÉCNICO:
- Total órdenes: ${l.length}
- Por tipo: ${Object.entries(l.reduce((e,n)=>(e[n.type]=(e[n.type]||0)+1,e),{})).map(([e,n])=>`${e}:${n}`).join(", ")}
- Por equipo: ${Object.entries(l.reduce((e,n)=>(e[n.equipment_type]=(e[n.equipment_type]||0)+1,e),{})).map(([e,n])=>`${e==null?void 0:e.replace(/_/g," ")}:${n}`).join(", ")}
- Pendientes: ${l.filter(e=>e.status==="pendiente").length}
- Completadas: ${l.filter(e=>e.status==="completada").length}
- Urgentes: ${l.filter(e=>e.priority==="urgente").length}
- Técnicos más activos: ${Object.entries(l.filter(e=>e.technician).reduce((e,n)=>(e[n.technician]=(e[n.technician]||0)+1,e),{})).sort((e,n)=>n[1]-e[1]).slice(0,3).map(([e,n])=>`${e}:${n}`).join(", ")||"N/D"}

MANTENIMIENTOS:
- Total fichas: ${f.length}
- Por tipo: ${Object.entries(f.reduce((e,n)=>(e[n.type]=(e[n.type]||0)+1,e),{})).map(([e,n])=>`${e}:${n}`).join(", ")}
- Fichas antiguas (>1 año): ${f.filter(e=>{try{return ue(new Date,J(e.date))>365}catch{return!1}}).length}

Genera informe técnico con:
1. **Resumen operacional** (carga de trabajo, capacidad)
2. **Análisis SAT** (tipos de averías más frecuentes, equipos problemáticos)
3. **Análisis de mantenimientos** (coberturas, frecuencias)
4. **Rendimiento del equipo técnico**
5. **Equipos y tecnologías más demandados**
6. **Recomendaciones técnicas** (formación, herramientas, procesos)`;if(c==="financiero"){const e=d.filter(t=>t.doc_type==="factura").reduce((t,r)=>t+(r.total||0),0),n=d.filter(t=>t.status==="pagado").reduce((t,r)=>t+(r.total||0),0),o=d.filter(t=>t.status==="vencido");return`Eres el director financiero de una empresa de instalaciones técnicas. Genera un informe financiero detallado.

PERÍODO: Últimos ${s} meses

INGRESOS:
- Facturado: ${e.toFixed(2)} €
- Cobrado: ${n.toFixed(2)} €
- Pendiente: ${(e-n).toFixed(2)} €
- Tasa cobro: ${e>0?Math.round(n/e*100):0}%
- Ticket medio factura: ${d.filter(t=>t.doc_type==="factura"&&t.total>0).length>0?(e/d.filter(t=>t.doc_type==="factura"&&t.total>0).length).toFixed(2):0} €

MOROSIDAD:
- Facturas vencidas: ${o.length} — ${o.reduce((t,r)=>t+(r.total||0),0).toFixed(2)} €
- Clientes morosos: ${j.filter(t=>t.payment_profile==="moroso").length}
- Clientes mal pagadores: ${j.filter(t=>t.payment_profile==="mal_pagador").length}
- Deuda total pendiente (clientes): ${j.filter(t=>t.pending_amount>0).reduce((t,r)=>t+(r.pending_amount||0),0).toFixed(2)} €

PRESUPUESTOS:
- Presupuestos emitidos: ${d.filter(t=>t.doc_type==="presupuesto").length}
- Valor total: ${d.filter(t=>t.doc_type==="presupuesto").reduce((t,r)=>t+(r.total||0),0).toFixed(2)} €

Genera informe financiero con:
1. **Resumen de tesorería** (ingresos, cobros, ratio de conversión)
2. **Análisis de morosidad** (riesgos, clientes problemáticos)
3. **Análisis de presupuestos** (tasa de conversión)
4. **Recomendaciones financieras** (gestión de cobros, protección ante impagos)
5. **Proyección** (estimación próximo período)`}if(c==="stock"){const e=x.filter(o=>o.min_stock>0&&o.quantity<=o.min_stock),n=x.reduce((o,t)=>o+(t.quantity||0)*(t.unit_price||0),0);return`Eres el responsable de logística y compras de una empresa de instalaciones técnicas. Genera un informe de inventario.

INVENTARIO ACTUAL:
- Artículos totales: ${x.length}
- Valor total estimado: ${n.toFixed(2)} €
- Artículos bajo mínimo: ${e.length}
- Artículos sin stock: ${x.filter(o=>o.quantity<=0).length}

POR CATEGORÍA:
${Object.entries(x.reduce((o,t)=>(o[t.category]=(o[t.category]||0)+1,o),{})).map(([o,t])=>`- ${o==null?void 0:o.replace(/_/g," ")}: ${t} artículos`).join(`
`)}

ARTÍCULOS CRÍTICOS (bajo mínimo):
${e.slice(0,10).map(o=>`- ${o.name}: ${o.quantity} ${o.unit} (mín: ${o.min_stock}) — Proveedor: ${o.supplier_name||"N/D"}`).join(`
`)}

Genera informe de inventario con:
1. **Estado general del stock**
2. **Artículos críticos** (necesitan reposición urgente)
3. **Análisis por categoría**
4. **Recomendaciones de compra** (qué pedir, a quién, cuánto)
5. **Optimización del inventario** (artículos obsoletos, sobrestock)`}return`Genera un informe de tipo ${c} para una empresa de instalaciones técnicas en España.`},oe=async()=>{var f,x;if(c==="cliente"&&!u)return alert("Selecciona un cliente");O(!0),v(null);const s=ne(),h=await $.integrations.Core.InvokeLLM({prompt:s,add_context_from_internet:!1}),y={id:Date.now(),type:c,typeLabel:((f=K.find(g=>g.value===c))==null?void 0:f.label)||c,contactId:u,contactName:((x=P.find(g=>g.id===u))==null?void 0:x.name)||"",period:N,content:h,date:z(new Date,"dd/MM/yyyy HH:mm")};v(y);const l=[y,...C].slice(0,10);R(l),localStorage.setItem("ai_reports_history",JSON.stringify(l)),O(!1)};return a.jsxs("div",{className:"space-y-4 max-w-4xl",children:[a.jsxs("div",{className:"flex items-center gap-3",children:[a.jsx("div",{className:"p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl",children:a.jsx(L,{className:"w-6 h-6 text-white"})}),a.jsxs("div",{children:[a.jsx("h1",{className:"text-2xl font-bold",children:"Informes IA Detallados"}),a.jsx("p",{className:"text-sm text-gray-500",children:"Análisis inteligentes de tu negocio vinculados al cliente"})]})]}),a.jsx(_,{children:a.jsxs(T,{className:"p-4 space-y-4",children:[a.jsxs("div",{children:[a.jsx("label",{className:"text-sm font-medium text-gray-700 mb-2 block",children:"Tipo de informe"}),a.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-2",children:K.map(s=>a.jsxs("button",{onClick:()=>Q(s.value),className:`text-left p-3 rounded-lg border transition-all ${c===s.value?"bg-purple-600 text-white border-purple-600":"bg-white border-gray-200 hover:border-purple-300"}`,children:[a.jsx("p",{className:"text-sm font-medium",children:s.label}),a.jsx("p",{className:`text-xs mt-0.5 ${c===s.value?"text-purple-200":"text-gray-500"}`,children:s.desc})]},s.value))})]}),c==="cliente"&&a.jsxs("div",{children:[a.jsx("label",{className:"text-sm font-medium text-gray-700 mb-1 block",children:"Cliente a analizar *"}),a.jsxs(k,{value:u,onValueChange:Y,children:[a.jsx(q,{children:a.jsx(G,{placeholder:"Selecciona un cliente..."})}),a.jsx(V,{children:P.map(s=>a.jsxs(b,{value:s.id,children:[s.name," ",s.surname||""," ",s.company_name?`— ${s.company_name}`:""]},s.id))})]})]}),c!=="stock"&&a.jsxs("div",{children:[a.jsx("label",{className:"text-sm font-medium text-gray-700 mb-1 block",children:"Período de análisis"}),a.jsxs(k,{value:N,onValueChange:W,children:[a.jsx(q,{className:"w-48",children:a.jsx(G,{})}),a.jsxs(V,{children:[a.jsx(b,{value:"1",children:"Último mes"}),a.jsx(b,{value:"3",children:"Últimos 3 meses"}),a.jsx(b,{value:"6",children:"Últimos 6 meses"}),a.jsx(b,{value:"12",children:"Último año"}),a.jsx(b,{value:"24",children:"Últimos 2 años"})]})]})]}),a.jsx(I,{onClick:oe,disabled:E||ee,className:"w-full bg-purple-600 hover:bg-purple-700 gap-2",children:E?a.jsxs(a.Fragment,{children:[a.jsx(ce,{className:"w-4 h-4 animate-spin"}),"Generando informe IA..."]}):a.jsxs(a.Fragment,{children:[a.jsx(B,{className:"w-4 h-4"}),"Generar Informe IA"]})})]})}),p&&a.jsxs(_,{className:"border-purple-200",children:[a.jsx(U,{className:"pb-2 bg-gradient-to-r from-purple-50 to-indigo-50",children:a.jsxs("div",{className:"flex items-start justify-between flex-wrap gap-2",children:[a.jsxs("div",{children:[a.jsxs(H,{className:"text-base flex items-center gap-2",children:[a.jsx(B,{className:"w-5 h-5 text-purple-600"}),p.typeLabel]}),a.jsxs("p",{className:"text-xs text-gray-500 mt-0.5",children:[p.contactName&&a.jsxs("span",{children:["Cliente: ",a.jsx("strong",{children:p.contactName})," · "]}),"Generado: ",p.date]})]}),a.jsxs("div",{className:"flex gap-2",children:[a.jsx(I,{size:"sm",variant:"outline",onClick:()=>navigator.clipboard.writeText(p.content),children:"Copiar"}),a.jsx(I,{size:"sm",variant:S?"default":"outline",onClick:()=>X(s=>!s),children:S?a.jsxs(a.Fragment,{children:[a.jsx(de,{className:"w-3 h-3 mr-1"}),"Listo"]}):a.jsxs(a.Fragment,{children:[a.jsx(ge,{className:"w-3 h-3 mr-1"}),"Editar"]})}),a.jsx(he,{contentRef:F,title:p.typeLabel})]})]})}),a.jsx(T,{className:"p-5",children:a.jsxs("div",{ref:F,className:"space-y-4",children:[a.jsx(xe,{className:"pb-3 border-b"}),a.jsxs("div",{className:"text-right text-xs text-gray-400",children:[p.typeLabel," · ",p.date]}),S?a.jsx(fe,{value:p.content,onChange:s=>v(h=>({...h,content:s.target.value})),rows:30,className:"font-mono text-xs"}):a.jsx(me,{className:"text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 prose-headings:text-gray-800 prose-headings:font-bold prose-h2:text-base prose-h3:text-sm prose-strong:text-gray-900 prose-ul:list-disc prose-ol:list-decimal",children:p.content})]})})]}),C.length>0&&a.jsxs(_,{children:[a.jsx(U,{className:"pb-2",children:a.jsx(H,{className:"text-sm",children:"Informes generados anteriormente"})}),a.jsx(T,{className:"p-0",children:a.jsx("div",{className:"divide-y max-h-64 overflow-y-auto",children:C.map((s,h)=>a.jsxs("button",{onClick:()=>v(s),className:"w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3",children:[a.jsx(L,{className:"w-4 h-4 text-purple-400 flex-shrink-0"}),a.jsxs("div",{className:"flex-1 min-w-0",children:[a.jsx("p",{className:"text-sm font-medium truncate",children:s.typeLabel}),a.jsxs("p",{className:"text-xs text-gray-400",children:[s.contactName&&`${s.contactName} · `,s.date]})]}),a.jsxs(pe,{variant:"outline",className:"text-[10px] flex-shrink-0",children:[s.period,"m"]})]},s.id||h))})})]})]})}export{Ee as default};
