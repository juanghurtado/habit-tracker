import { Toast, ToastAction, ToastProvider, ToastViewport } from "./ui/toast"

interface ToasterProps {
  message: string
  open: boolean
  onUndo: () => void
  onClose: () => void
}

export function Toaster({ message, open, onUndo, onClose }: ToasterProps) {
  return (
    <ToastProvider>
      {open && (
        <Toast onOpenChange={onClose} open={open} duration={4000}>
          <p className="text-sm font-medium">{message}</p>
          <ToastAction altText="Undo" onClick={onUndo}>
            Undo
          </ToastAction>
        </Toast>
      )}
      <ToastViewport />
    </ToastProvider>
  )
}