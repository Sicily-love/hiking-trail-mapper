export interface DialogBaseOptions {
  title?: string;
  message?: string;
  danger?: boolean;
  initialFocus?: string | HTMLElement;
}

export interface InfoDialogOptions extends DialogBaseOptions {
  message: string;
  okLabel?: string;
}

export interface ConfirmDialogOptions extends DialogBaseOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface PromptDialogOptions extends DialogBaseOptions {
  message?: string;
  inputLabel?: string;
  value?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  requiredMessage?: string;
  maxLength?: number;
  autocomplete?: string;
  selectOnOpen?: boolean;
  validate?: (value: string) => string | null | undefined;
}

export type DialogActionKind = 'secondary' | 'primary' | 'danger';

export interface CustomDialogActionOptions {
  kind?: DialogActionKind;
  autofocus?: boolean;
  disabled?: boolean;
}

export interface CustomDialogContext<TResult> {
  dialog: HTMLDialogElement;
  form: HTMLFormElement;
  body: HTMLElement;
  actions: HTMLElement;
  close: (value: TResult) => void;
  cancel: () => void;
  appendText: (text: string, className?: string) => HTMLParagraphElement;
  addAction: (
    label: string,
    value: TResult,
    options?: CustomDialogActionOptions,
  ) => HTMLButtonElement;
}

export interface CustomDialogOptions<TResult> extends DialogBaseOptions {
  render: (context: CustomDialogContext<TResult>) => void;
  cancelValue?: TResult | null;
}

interface DialogElements {
  dialog: HTMLDialogElement;
  form: HTMLFormElement;
  body: HTMLElement;
  actions: HTMLElement;
}

interface DialogBuildContext<TResult> extends DialogElements {
  close: (value: TResult) => void;
  cancel: () => void;
}

type DialogBuilder<TResult> = (context: DialogBuildContext<TResult>) => void;

function focusElement(element: HTMLElement | null): void {
  if(!element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    try {
      element.focus();
    } catch {
      // The node may have become inert or disconnected between scheduling and focus.
    }
  }
}

/** Native modal dialog controller shared by Workbench commands and features. */
export class DialogController {
  private readonly document: Document;
  private queue: Promise<void> = Promise.resolve();
  private activeCancel: (() => void) | null = null;
  private destroyed = false;
  private nextId = 0;

  constructor(documentRef?: Document) {
    const resolved = documentRef ?? (typeof document === 'undefined' ? null : document);
    if(!resolved) throw new Error('DialogController requires a Document');
    this.document = resolved;
  }

  info(options: string | InfoDialogOptions): Promise<void> {
    const normalized: InfoDialogOptions = typeof options === 'string'
      ? { message: options }
      : options;

    return this.enqueue(() => this.open<void>(
      { ...normalized, title: normalized.title ?? 'Notice' },
      undefined,
      context => {
        context.form.addEventListener('submit', event => {
          event.preventDefault();
          context.close(undefined);
        });
        const ok = this.createButton(normalized.okLabel ?? 'OK', 'primary', true, true);
        context.actions.append(ok);
      },
    ));
  }

  confirm(options: string | ConfirmDialogOptions): Promise<boolean> {
    const normalized: ConfirmDialogOptions = typeof options === 'string'
      ? { message: options }
      : options;

    return this.enqueue(() => this.open<boolean>(
      { ...normalized, title: normalized.title ?? 'Confirm' },
      false,
      context => {
        const cancel = this.createButton(
          normalized.cancelLabel ?? 'Cancel',
          'secondary',
          Boolean(normalized.danger),
        );
        cancel.addEventListener('click', context.cancel);

        const confirm = this.createButton(
          normalized.confirmLabel ?? 'Confirm',
          normalized.danger ? 'danger' : 'primary',
          !normalized.danger,
          true,
        );
        context.form.addEventListener('submit', event => {
          event.preventDefault();
          context.close(true);
        });
        context.actions.append(cancel, confirm);
      },
    ));
  }

  prompt(options: string | PromptDialogOptions): Promise<string | null> {
    const normalized: PromptDialogOptions = typeof options === 'string'
      ? { message: options }
      : options;

    return this.enqueue(() => this.open<string | null>(
      { ...normalized, title: normalized.title ?? 'Input' },
      null,
      context => {
        const label = this.document.createElement('label');
        label.className = 'workbench-dialog__field';

        if(normalized.inputLabel) {
          const labelText = this.document.createElement('span');
          labelText.className = 'workbench-dialog__label';
          labelText.textContent = normalized.inputLabel;
          label.append(labelText);
        }

        const input = this.document.createElement('input');
        input.className = 'workbench-dialog__input';
        input.type = 'text';
        input.value = normalized.value ?? '';
        input.placeholder = normalized.placeholder ?? '';
        input.setAttribute('autocomplete', normalized.autocomplete ?? 'off');
        input.required = Boolean(normalized.required);
        input.autofocus = normalized.initialFocus == null;
        input.setAttribute('aria-label', normalized.inputLabel ?? normalized.title ?? 'Value');
        if(normalized.maxLength != null) input.maxLength = normalized.maxLength;
        label.append(input);

        const error = this.document.createElement('p');
        error.className = 'workbench-dialog__error';
        error.id = `workbench-dialog-error-${this.nextId}`;
        error.setAttribute('role', 'alert');
        error.setAttribute('aria-live', 'polite');
        input.setAttribute('aria-errormessage', error.id);
        context.body.append(label, error);

        const cancel = this.createButton(normalized.cancelLabel ?? 'Cancel', 'secondary');
        cancel.addEventListener('click', context.cancel);
        const confirm = this.createButton(
          normalized.confirmLabel ?? 'Confirm',
          normalized.danger ? 'danger' : 'primary',
          false,
          true,
        );
        context.actions.append(cancel, confirm);

        const validationMessage = (): string | null => {
          if(normalized.required && !input.value.trim()) {
            return normalized.requiredMessage ?? 'A value is required.';
          }
          return normalized.validate?.(input.value) || null;
        };
        const clearError = () => {
          error.textContent = '';
          input.removeAttribute('aria-invalid');
        };
        input.addEventListener('input', clearError);
        context.form.addEventListener('submit', event => {
          event.preventDefault();
          const message = validationMessage();
          if(message) {
            error.textContent = message;
            input.setAttribute('aria-invalid', 'true');
            focusElement(input);
            return;
          }
          context.close(input.value);
        });

        if(normalized.selectOnOpen) {
          queueMicrotask(() => {
            if(this.document.activeElement === input) input.select();
          });
        }
      },
    ));
  }

  openCustom<TResult>(options: CustomDialogOptions<TResult>): Promise<TResult | null> {
    const cancelValue = options.cancelValue === undefined ? null : options.cancelValue;
    return this.enqueue(() => this.open<TResult | null>(
      { ...options, title: options.title ?? 'Dialog' },
      cancelValue,
      context => {
        const appendText = (text: string, className?: string) => {
          const paragraph = this.document.createElement('p');
          if(className) paragraph.className = className;
          paragraph.textContent = text;
          context.body.append(paragraph);
          return paragraph;
        };
        const addAction = (
          label: string,
          value: TResult,
          actionOptions: CustomDialogActionOptions = {},
        ) => {
          const kind = actionOptions.kind ?? (options.danger ? 'danger' : 'primary');
          const button = this.createButton(label, kind, actionOptions.autofocus);
          button.disabled = Boolean(actionOptions.disabled);
          button.addEventListener('click', () => context.close(value));
          context.actions.append(button);
          return button;
        };

        options.render({
          ...context,
          close: value => context.close(value),
          appendText,
          addAction,
        });
      },
    ));
  }

  close(): void {
    this.activeCancel?.();
  }

  destroy(): void {
    if(this.destroyed) return;
    this.destroyed = true;
    this.close();
  }

  private enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    const run = () => {
      if(this.destroyed) return Promise.reject(new Error('DialogController has been destroyed'));
      return operation();
    };
    const result = this.queue.then(run, run);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private open<TResult>(
    options: DialogBaseOptions,
    cancelValue: TResult,
    build: DialogBuilder<TResult>,
  ): Promise<TResult> {
    const previousFocus = this.getActiveElement();
    const elements = this.createElements(options);

    return new Promise<TResult>((resolve, reject) => {
      let settled = false;
      const restoreFocus = () => {
        if(previousFocus?.isConnected) focusElement(previousFocus);
      };
      const cleanup = () => {
        elements.dialog.removeEventListener('cancel', onCancel);
        elements.dialog.removeEventListener('close', onNativeClose);
        elements.dialog.removeEventListener('keydown', onKeyDown);
        if(elements.dialog.open) elements.dialog.close();
        elements.dialog.remove();
        this.activeCancel = null;
        queueMicrotask(restoreFocus);
      };
      const settle = (value: TResult) => {
        if(settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };
      const fail = (error: unknown) => {
        if(settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const cancel = () => settle(cancelValue);
      const onCancel = (event: Event) => {
        event.preventDefault();
        cancel();
      };
      const onNativeClose = () => cancel();
      const onKeyDown = (event: KeyboardEvent) => {
        if(event.key !== 'Escape') return;
        event.preventDefault();
        cancel();
      };
      const preventNativeSubmit = (event: SubmitEvent) => event.preventDefault();

      elements.dialog.addEventListener('cancel', onCancel);
      elements.dialog.addEventListener('close', onNativeClose);
      elements.dialog.addEventListener('keydown', onKeyDown);
      elements.form.addEventListener('submit', preventNativeSubmit);
      this.activeCancel = cancel;

      try {
        build({ ...elements, close: settle, cancel });
        if(!this.document.body) throw new Error('DialogController requires document.body');
        this.document.body.append(elements.dialog);
        elements.dialog.showModal();
        this.focusInitial(elements.dialog, options.initialFocus);
      } catch(error) {
        fail(error);
      }
    });
  }

  private createElements(options: DialogBaseOptions): DialogElements {
    this.nextId += 1;
    const dialog = this.document.createElement('dialog');
    dialog.className = 'workbench-dialog';
    dialog.dataset.variant = options.danger ? 'danger' : 'default';
    dialog.classList.toggle('workbench-dialog--danger', Boolean(options.danger));
    dialog.setAttribute('aria-modal', 'true');

    const form = this.document.createElement('form');
    form.className = 'workbench-dialog__surface';
    form.method = 'dialog';
    form.noValidate = true;

    const title = this.document.createElement('h2');
    title.className = 'workbench-dialog__title';
    title.id = `workbench-dialog-title-${this.nextId}`;
    title.textContent = options.title ?? 'Dialog';
    dialog.setAttribute('aria-labelledby', title.id);
    form.append(title);

    if(options.message) {
      const message = this.document.createElement('p');
      message.className = 'workbench-dialog__message';
      message.id = `workbench-dialog-message-${this.nextId}`;
      message.textContent = options.message;
      dialog.setAttribute('aria-describedby', message.id);
      form.append(message);
    }

    const body = this.document.createElement('div');
    body.className = 'workbench-dialog__body';
    const actions = this.document.createElement('div');
    actions.className = 'workbench-dialog__actions';
    form.append(body, actions);
    dialog.append(form);
    return { dialog, form, body, actions };
  }

  private createButton(
    label: string,
    kind: DialogActionKind,
    autofocus = false,
    submit = false,
  ): HTMLButtonElement {
    const button = this.document.createElement('button');
    button.type = submit ? 'submit' : 'button';
    button.className = `workbench-dialog__button workbench-dialog__button--${kind}`;
    button.textContent = label;
    button.autofocus = autofocus;
    return button;
  }

  private getActiveElement(): HTMLElement | null {
    const active = this.document.activeElement as HTMLElement | null;
    return active && typeof active.focus === 'function' ? active : null;
  }

  private focusInitial(dialog: HTMLDialogElement, requested?: string | HTMLElement): void {
    let target: HTMLElement | null = null;
    if(typeof requested === 'string') {
      try {
        target = dialog.querySelector<HTMLElement>(requested);
      } catch {
        target = null;
      }
    } else if(requested && dialog.contains(requested)) {
      target = requested;
    }
    target ??= dialog.querySelector<HTMLElement>(
      '[autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
    );
    focusElement(target);
  }
}

export function createDialogController(documentRef?: Document): DialogController {
  return new DialogController(documentRef);
}
