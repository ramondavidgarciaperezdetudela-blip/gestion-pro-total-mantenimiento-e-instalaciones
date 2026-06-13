import{r as i,O as r,b as m,j as e,m as R,J as S,K as E,S as u,h,i as v,k as b,l as d,C as ce,a6 as H,I as x,B as g,P as re,M as de,N as oe,X as xe,w as me,q as pe,ae as ue,D as he,o as ve,t as f}from"./index-DnoxNRs_.js";import{T as I}from"./textarea-Cokfp6ck.js";import{P as be}from"./pen-DcKkbbif.js";import{e as p}from"./es-D8iT7F0D.js";const k={pendiente:{color:"bg-amber-100 text-amber-800",label:"⏳ Pendiente",icon:R},en_reparacion:{color:"bg-blue-100 text-blue-800",label:"🔧 En reparación",icon:H},resuelto:{color:"bg-green-100 text-green-800",label:"✅ Resuelto",icon:ce}},V=[{value:"compresor",label:"Compresor"},{value:"ventilador",label:"Ventilador"},{value:"termostato",label:"Termostato"},{value:"valvula",label:"Válvula"},{value:"condensador",label:"Condensador"},{value:"evaporador",label:"Evaporador"},{value:"fugas_gas",label:"Fugas de gas"},{value:"problemas_electricos",label:"Problemas eléctricos"},{value:"mantenimiento",label:"Mantenimiento"},{value:"otro",label:"Otro"}];function Ee(){const[w,U]=i.useState([]),[B,G]=i.useState([]),[ge,Q]=i.useState([]),[M,Y]=i.useState(null),[J,L]=i.useState(!0),[K,W]=i.useState([]),[T,X]=i.useState(""),[$,Z]=i.useState(""),[j,ee]=i.useState(""),[A,y]=i.useState(!1),[q,P]=i.useState(null),[s,t]=i.useState({contact_id:"",contact_name:"",equipment_type:"otro",equipment_brand:"",equipment_model:"",serial_number:"",failure_date:r(new Date,"yyyy-MM-dd"),failure_type:"otro",description:"",diagnosis:"",solution:"",technician:"",repair_date:"",repair_hours:0,status:"pendiente",notes:""}),[fe,je]=i.useState(null),[ye,Ne]=i.useState(!1);i.useRef(null),i.useEffect(()=>{D()},[]);const D=async()=>{var a,l;L(!0);try{const[n,N,c,o]=await Promise.all([m.entities.Contact.list("-created_date",500),m.entities.EquipmentFailure.list("-failure_date",200),m.entities.CompanySettings.list(),((l=(a=m.entities.ClientMachine)==null?void 0:a.list)==null?void 0:l.call(a,"-created_date",100))||Promise.resolve([])]);U(n),G(N),c.length>0&&(Y(c[0]),c[0].technicians&&W(c[0].technicians)),o.length>0&&Q(o)}catch(n){console.error("Error loading data:",n)}L(!1)},ae=a=>{X(a);const l=w.find(n=>n.id===a);l&&t(n=>({...n,contact_id:a,contact_name:`${l.name} ${l.surname||""}`}))},se=async()=>{if(!s.contact_id||!s.description){f.error("Rellena campos requeridos");return}try{q?(await m.entities.EquipmentFailure.update(q,s),f.success("Incidencia actualizada")):(await m.entities.EquipmentFailure.create(s),f.success("Incidencia registrada")),C(),y(!1),await D()}catch{f.error("Error al guardar")}},le=a=>{t(a),P(a.id),y(!0)},te=async a=>{if(confirm("¿Eliminar esta incidencia?"))try{await m.entities.EquipmentFailure.delete(a),f.success("Incidencia eliminada"),await D()}catch{f.error("Error al eliminar")}},C=()=>{t({contact_id:"",contact_name:"",equipment_type:"otro",equipment_brand:"",equipment_model:"",serial_number:"",failure_date:r(new Date,"yyyy-MM-dd"),failure_type:"otro",description:"",diagnosis:"",solution:"",technician:"",repair_date:"",repair_hours:0,status:"pendiente",notes:""}),P(null)},F=B.filter(a=>{var c,o,_;const l=!T||a.contact_id===T,n=!$||a.status===$,N=!j||((c=a.contact_name)==null?void 0:c.toLowerCase().includes(j.toLowerCase()))||((o=a.equipment_brand)==null?void 0:o.toLowerCase().includes(j.toLowerCase()))||((_=a.description)==null?void 0:_.toLowerCase().includes(j.toLowerCase()));return l&&n&&N}),ie=a=>{var o,_,O,z;const l=`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Incidencia</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1e3a5f; padding-bottom: 15px; }
    .logo { font-size: 24px; font-weight: bold; color: #1e3a5f; }
    .subtitle { color: #666; font-size: 12px; margin-top: 5px; }
    .section { margin: 20px 0; }
    .section-title { font-size: 14px; font-weight: bold; color: white; background: #1e3a5f; padding: 8px 12px; margin-bottom: 10px; }
    .field { margin: 8px 0; display: flex; }
    .field-label { font-weight: bold; width: 180px; color: #555; }
    .field-value { flex: 1; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .signature-area { margin-top: 40px; height: 60px; display: flex; gap: 40px; }
    .signature { border-top: 1px solid #000; text-align: center; font-size: 12px; width: 150px; }
    .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${(M==null?void 0:M.company_name)||"Empresa"}</div>
    <div class="subtitle">REPORTE DE INCIDENCIA / AVERÍA</div>
    <div style="font-size: 11px; color: #666; margin-top: 10px;">
      Ref: ${(o=a.id)==null?void 0:o.substring(0,8)} | Fecha: ${r(new Date(a.failure_date),"dd/MM/yyyy",{locale:p})}
    </div>
  </div>

  <div class="section">
    <div class="section-title">📋 INFORMACIÓN DEL CLIENTE</div>
    <div class="field">
      <span class="field-label">Nombre:</span>
      <span class="field-value">${a.contact_name}</span>
    </div>
    <div class="field">
      <span class="field-label">Estado:</span>
      <span class="field-value">
        <span class="status-badge" style="${a.status==="resuelto"?"background: #d1fae5; color: #065f46;":a.status==="en_reparacion"?"background: #dbeafe; color: #1e40af;":"background: #fef3c7; color: #92400e;"}">
          ${((_=k[a.status])==null?void 0:_.label)||a.status}
        </span>
      </span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔧 EQUIPO / MÁQUINA</div>
    <div class="field">
      <span class="field-label">Tipo:</span>
      <span class="field-value">${a.equipment_type}</span>
    </div>
    <div class="field">
      <span class="field-label">Marca:</span>
      <span class="field-value">${a.equipment_brand||"-"}</span>
    </div>
    <div class="field">
      <span class="field-label">Modelo:</span>
      <span class="field-value">${a.equipment_model||"-"}</span>
    </div>
    <div class="field">
      <span class="field-label">Nº Serie:</span>
      <span class="field-value">${a.serial_number||"-"}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">⚠️ DESCRIPCIÓN DEL PROBLEMA</div>
    <div class="field">
      <span class="field-label">Tipo de avería:</span>
      <span class="field-value">${((O=V.find(ne=>ne.value===a.failure_type))==null?void 0:O.label)||a.failure_type}</span>
    </div>
    <div class="field">
      <span class="field-label">Descripción:</span>
      <span class="field-value">${a.description||"-"}</span>
    </div>
    <div class="field">
      <span class="field-label">Diagnóstico:</span>
      <span class="field-value">${a.diagnosis||"-"}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔨 REPARACIÓN</div>
    <div class="field">
      <span class="field-label">Técnico asignado:</span>
      <span class="field-value">${a.technician||"-"}</span>
    </div>
    <div class="field">
      <span class="field-label">Fecha de reparación:</span>
      <span class="field-value">${a.repair_date?r(new Date(a.repair_date),"dd/MM/yyyy",{locale:p}):"-"}</span>
    </div>
    <div class="field">
      <span class="field-label">Horas de trabajo:</span>
      <span class="field-value">${a.repair_hours||0} horas</span>
    </div>
    <div class="field">
      <span class="field-label">Solución aplicada:</span>
      <span class="field-value">${a.solution||"-"}</span>
    </div>
  </div>

  ${a.notes?`
  <div class="section">
    <div class="section-title">📝 NOTAS ADICIONALES</div>
    <div class="field">
      <span class="field-value">${a.notes}</span>
    </div>
  </div>
  `:""}

  <div class="section">
    <div class="section-title">📅 FECHAS</div>
    <div class="field">
      <span class="field-label">Fecha de reporte:</span>
      <span class="field-value">${r(new Date(a.failure_date),"dd/MM/yyyy HH:mm",{locale:p})}</span>
    </div>
    ${a.repair_date?`
    <div class="field">
      <span class="field-label">Fecha de resolución:</span>
      <span class="field-value">${r(new Date(a.repair_date),"dd/MM/yyyy",{locale:p})}</span>
    </div>
    `:""}
  </div>

  <div class="signature-area">
    <div class="signature">
      <div style="padding-top: 10px;">Firma Técnico</div>
    </div>
    <div class="signature">
      <div style="padding-top: 10px;">Firma Cliente</div>
    </div>
  </div>

  <div class="footer">
    <p>Documento generado automáticamente por sistema de gestión de incidencias</p>
    <p>Generado: ${r(new Date,"dd/MM/yyyy HH:mm",{locale:p})}</p>
  </div>
</body>
</html>`,n=new Blob([l],{type:"text/html"}),N=URL.createObjectURL(n),c=document.createElement("a");c.href=N,c.download=`reporte-incidencia-${(z=a.id)==null?void 0:z.substring(0,8)}.html`,c.click()};return J?e.jsx("div",{className:"p-4 text-center",children:"Cargando..."}):e.jsxs("div",{className:"space-y-4 max-w-6xl",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl",children:e.jsx(R,{className:"w-6 h-6 text-white"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold",children:"Gestión de Incidencias"}),e.jsx("p",{className:"text-sm text-gray-500",children:"Registra, asigna y sigue el estado de averías y reparaciones"})]})]}),e.jsx(S,{className:"bg-gray-50",children:e.jsx(E,{className:"p-4 space-y-3",children:e.jsxs("div",{className:"flex gap-3 flex-wrap items-end",children:[e.jsxs("div",{className:"flex-1 min-w-48",children:[e.jsx("label",{className:"text-xs text-gray-600 font-semibold mb-1 block",children:"Filtrar por cliente"}),e.jsxs(u,{value:T,onValueChange:ae,children:[e.jsx(h,{className:"bg-white",children:e.jsx(v,{placeholder:"Todos los clientes"})}),e.jsxs(b,{children:[e.jsx(d,{value:null,children:"Todos los clientes"}),w.map(a=>e.jsxs(d,{value:a.id,children:[a.name," ",a.surname||""]},a.id))]})]})]}),e.jsxs("div",{className:"w-32",children:[e.jsx("label",{className:"text-xs text-gray-600 font-semibold mb-1 block",children:"Estado"}),e.jsxs(u,{value:$,onValueChange:Z,children:[e.jsx(h,{className:"bg-white",children:e.jsx(v,{placeholder:"Todos"})}),e.jsxs(b,{children:[e.jsx(d,{value:null,children:"Todos"}),Object.entries(k).map(([a,l])=>e.jsx(d,{value:a,children:l.label},a))]})]})]}),e.jsxs("div",{className:"flex-1 min-w-48",children:[e.jsx("label",{className:"text-xs text-gray-600 font-semibold mb-1 block",children:"Buscar"}),e.jsx(x,{placeholder:"Cliente, equipo, descripción...",value:j,onChange:a=>ee(a.target.value),className:"bg-white"})]}),e.jsxs(g,{onClick:()=>{C(),y(!A)},className:"bg-red-600 hover:bg-red-700",children:[e.jsx(re,{className:"w-4 h-4 mr-2"})," Nueva Incidencia"]})]})})}),A&&e.jsxs(S,{className:"border-red-200 bg-red-50",children:[e.jsx(de,{className:"pb-3",children:e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsxs(oe,{className:"text-lg",children:[q?"✏️ Editar":"➕ Nueva"," Incidencia"]}),e.jsx("button",{onClick:()=>{y(!1),C()},className:"text-gray-400 hover:text-gray-600",children:e.jsx(xe,{className:"w-5 h-5"})})]})}),e.jsxs(E,{className:"p-4 space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Cliente *"}),e.jsxs(u,{value:s.contact_id,onValueChange:a=>{const l=w.find(n=>n.id===a);t(n=>({...n,contact_id:a,contact_name:l?`${l.name} ${l.surname||""}`:""}))},children:[e.jsx(h,{children:e.jsx(v,{placeholder:"Seleccionar cliente"})}),e.jsx(b,{children:w.map(a=>e.jsxs(d,{value:a.id,children:[a.name," ",a.surname||""]},a.id))})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Tipo equipo"}),e.jsx(x,{value:s.equipment_type,onChange:a=>t({...s,equipment_type:a.target.value})})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Marca"}),e.jsx(x,{value:s.equipment_brand,onChange:a=>t({...s,equipment_brand:a.target.value})})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Modelo"}),e.jsx(x,{value:s.equipment_model,onChange:a=>t({...s,equipment_model:a.target.value})})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Nº Serie"}),e.jsx(x,{value:s.serial_number,onChange:a=>t({...s,serial_number:a.target.value})})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Fecha avería"}),e.jsx(x,{type:"date",value:s.failure_date,onChange:a=>t({...s,failure_date:a.target.value})})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Tipo avería"}),e.jsxs(u,{value:s.failure_type,onValueChange:a=>t({...s,failure_type:a}),children:[e.jsx(h,{children:e.jsx(v,{})}),e.jsx(b,{children:V.map(a=>e.jsx(d,{value:a.value,children:a.label},a.value))})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Estado"}),e.jsxs(u,{value:s.status,onValueChange:a=>t({...s,status:a}),children:[e.jsx(h,{children:e.jsx(v,{})}),e.jsx(b,{children:Object.entries(k).map(([a,l])=>e.jsx(d,{value:a,children:l.label},a))})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Técnico"}),e.jsxs(u,{value:s.technician,onValueChange:a=>t({...s,technician:a}),children:[e.jsx(h,{children:e.jsx(v,{placeholder:"Asignar técnico"})}),e.jsxs(b,{children:[e.jsx(d,{value:null,children:"Sin asignar"}),K.map(a=>e.jsx(d,{value:a,children:a},a))]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Fecha reparación"}),e.jsx(x,{type:"date",value:s.repair_date,onChange:a=>t({...s,repair_date:a.target.value})})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Horas trabajo"}),e.jsx(x,{type:"number",value:s.repair_hours,onChange:a=>t({...s,repair_hours:parseFloat(a.target.value)||0})})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Descripción *"}),e.jsx(I,{value:s.description,onChange:a=>t({...s,description:a.target.value}),rows:2})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Diagnóstico"}),e.jsx(I,{value:s.diagnosis,onChange:a=>t({...s,diagnosis:a.target.value}),rows:2})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Solución"}),e.jsx(I,{value:s.solution,onChange:a=>t({...s,solution:a.target.value}),rows:2})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-xs font-semibold text-gray-700 mb-1 block",children:"Notas adicionales"}),e.jsx(I,{value:s.notes,onChange:a=>t({...s,notes:a.target.value}),rows:2})]})]}),e.jsxs("div",{className:"flex gap-2 justify-end",children:[e.jsx(g,{variant:"outline",onClick:()=>{y(!1),C()},children:"Cancelar"}),e.jsxs(g,{onClick:se,className:"bg-green-600 hover:bg-green-700",children:[e.jsx(me,{className:"w-4 h-4 mr-2"})," Guardar"]})]})]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("div",{className:"flex justify-between items-center",children:e.jsxs("h2",{className:"font-semibold text-gray-800",children:[F.length," incidencias encontradas"]})}),F.length===0?e.jsx(S,{className:"bg-gray-50",children:e.jsxs(E,{className:"p-8 text-center",children:[e.jsx(R,{className:"w-8 h-8 text-gray-300 mx-auto mb-2"}),e.jsx("p",{className:"text-gray-400",children:"Sin incidencias registradas"})]})}):F.map(a=>{const l=k[a.status]||{};return e.jsx(S,{className:"hover:shadow-md transition-shadow",children:e.jsx(E,{className:"p-4",children:e.jsxs("div",{className:"flex flex-wrap justify-between items-start gap-3",children:[e.jsxs("div",{className:"flex-1 min-w-0 space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx("h3",{className:"font-semibold text-gray-900",children:a.contact_name}),e.jsx(pe,{className:l.color,children:l.label}),e.jsxs("span",{className:"text-xs text-gray-500",children:[a.equipment_brand," ",a.equipment_model]})]}),e.jsx("p",{className:"text-sm text-gray-700",children:a.description}),e.jsxs("div",{className:"flex flex-wrap gap-4 text-xs text-gray-600",children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(ue,{className:"w-3 h-3"})," ",r(new Date(a.failure_date),"dd/MM/yyyy",{locale:p})]}),a.technician&&e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx(H,{className:"w-3 h-3"})," ",a.technician]}),a.repair_date&&e.jsxs("span",{className:"text-green-700 font-semibold",children:["Reparado: ",r(new Date(a.repair_date),"dd/MM/yyyy",{locale:p})]})]})]}),e.jsxs("div",{className:"flex gap-2 flex-shrink-0",children:[e.jsx(g,{size:"sm",variant:"outline",onClick:()=>ie(a),children:e.jsx(he,{className:"w-3.5 h-3.5"})}),e.jsx(g,{size:"sm",variant:"outline",onClick:()=>le(a),children:e.jsx(be,{className:"w-3.5 h-3.5"})}),e.jsx(g,{size:"sm",variant:"outline",className:"text-red-500 hover:text-red-700",onClick:()=>te(a.id),children:e.jsx(ve,{className:"w-3.5 h-3.5"})})]})]})})},a.id)})]})]})}export{Ee as default};
