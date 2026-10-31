"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Barra de VOLVER, siempre visible.
 *
 * Antes el único modo de salir de una ventana era una X diminuta colocada en
 * `absolute right-4 top-4`. Dentro de una ventana que hace scroll, "absolute"
 * quiere decir que la X se va hacia arriba con el contenido: al bajar por una
 * ficha larga desaparecía y ya no había forma de salir. Y encima varias
 * pantallas anulan el cierre de Radix (onOpenChange={() => {}}) para que no se
 * pierda lo escrito al tocar fuera, así que aunque se alcanzara la X tampoco
 * hacía nada. Resultado: el documento se quedaba fijo en pantalla.
 *
 * Ahora es una barra pegada arriba (`sticky`), que no se va con el scroll, con
 * un botón grande de tocar con el dedo. Si la pantalla pasa `onVolver`, se usa
 * eso —que es lo que funciona aunque el cierre de Radix esté anulado—; si no,
 * se cae al cierre normal.
 */
const BarraVolver = ({ onVolver, textoVolver }) => {
  const clases = "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold "
    + "text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400";
  const dentro = (<><ArrowLeft className="h-4 w-4" />{textoVolver}</>);
  return (
    <div className="sticky top-0 z-20 -mt-2 mb-1 flex items-center rounded-lg border border-border bg-card/95 px-1.5 py-1 shadow-sm backdrop-blur print:hidden">
      {onVolver
        ? <button type="button" onClick={onVolver} className={clases} data-prueba="volver" aria-label={textoVolver}>{dentro}</button>
        : <DialogPrimitive.Close className={clases} data-prueba="volver" aria-label={textoVolver}>{dentro}</DialogPrimitive.Close>}
    </div>
  );
};

const DialogContent = React.forwardRef((
  { className, children, onVolver, textoVolver = "Volver", sinVolver = false, ...props }, ref,
) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg max-h-[85vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}>
      {!sinVolver && <BarraVolver onVolver={onVolver} textoVolver={textoVolver} />}
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 border-b border-border pb-3 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
