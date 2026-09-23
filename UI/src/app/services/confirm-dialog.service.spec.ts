import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ConfirmDialogService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no open dialog', () => {
    expect(service.state()).toBeNull();
    expect(service.closing()).toBe(false);
  });

  it('confirm() opens with the default title, labels and variant', () => {
    void service.confirm('Proceed?');

    expect(service.state()).toEqual({
      message: 'Proceed?',
      title: 'Please confirm',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      variant: 'default',
    });
  });

  it('confirm() honors overridden options', () => {
    void service.confirm('Really delete?', {
      title: 'Delete item?',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      variant: 'danger',
    });

    expect(service.state()).toMatchObject({
      title: 'Delete item?',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      variant: 'danger',
    });
  });

  it.each([true, false])(
    'respond(%s) resolves the pending promise with that answer',
    async (answer) => {
      const pending = service.confirm('Proceed?');

      service.respond(answer);

      await expect(pending).resolves.toBe(answer);
    },
  );

  it('respond() sets closing at once, then clears the state after the close animation', () => {
    void service.confirm('Proceed?');
    service.respond(true);

    expect(service.closing()).toBe(true);
    expect(service.state()).not.toBeNull();

    vi.advanceTimersByTime(150);

    expect(service.state()).toBeNull();
    expect(service.closing()).toBe(false);
  });

  it('respond() with no pending confirm() is a no-op', () => {
    expect(() => service.respond(true)).not.toThrow();
    expect(service.state()).toBeNull();
  });

  it('a second confirm() while one is pending resolves the first as false', async () => {
    const first = service.confirm('First question?');
    const second = service.confirm('Second question?');

    await expect(first).resolves.toBe(false);
    expect(service.state()?.message).toBe('Second question?');

    service.respond(true);
    await expect(second).resolves.toBe(true);
  });

  it('a confirm() during the previous close animation stays open', () => {
    void service.confirm('First?');
    service.respond(true);
    void service.confirm('Second?');

    vi.advanceTimersByTime(150);

    expect(service.state()?.message).toBe('Second?');
    expect(service.closing()).toBe(false);
  });
});
