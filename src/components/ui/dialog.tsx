import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils.ts";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
  ref?: React.RefObject<React.ComponentRef<
    typeof DialogPrimitive.Overlay
  > | null>;
}) => (
  <DialogPrimitive.Overlay
    className={cn("DialogOverlay fixed inset-0 z-50 bg-black/40", className)}
    ref={ref}
    {...props}
  />
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  ref?: React.RefObject<React.ComponentRef<
    typeof DialogPrimitive.Content
  > | null>;
}) => {
  const childrenArray = React.Children.toArray(children);
  const firstChild = childrenArray[0] as React.ReactElement | undefined;

  const isHeader =
    React.isValidElement(firstChild) && firstChild.type === DialogHeader;

  const titleElement = isHeader
    ? React.Children.toArray(
        (firstChild.props as { children?: React.ReactNode }).children
      ).find(
        (c) =>
          React.isValidElement(c) &&
          (c.type === DialogPrimitive.Title || c.type === DialogTitle)
      )
    : undefined;

  const isTitleOnly =
    React.isValidElement(firstChild) &&
    (firstChild.type === DialogPrimitive.Title ||
      firstChild.type === DialogTitle);

  const hasHeader = !!(titleElement || isTitleOnly);
  const headerElement = isTitleOnly ? firstChild : titleElement;
  const bodyChildren = hasHeader ? childrenArray.slice(1) : childrenArray;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "DialogContent fixed inset-x-0 top-1/2 z-50 mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lg",
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="flex items-center border-border border-b px-6 pt-5 pb-4">
          {headerElement}
          <DialogPrimitive.Close
            className="ml-auto rounded-full opacity-70 ring-offset-card transition-all duration-150 hoverable:hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:bg-muted active:opacity-100 disabled:pointer-events-none [&_svg]:size-4"
            tabIndex={-1}
          >
            <X />
          </DialogPrimitive.Close>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {bodyChildren}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & {
  ref?: React.RefObject<React.ComponentRef<
    typeof DialogPrimitive.Title
  > | null>;
}) => (
  <DialogPrimitive.Title
    className={cn("font-semibold text-xl", className)}
    ref={ref}
    {...props}
  />
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
