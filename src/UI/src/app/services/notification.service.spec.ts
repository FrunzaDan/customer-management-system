import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no notifications', () => {
    expect(service.notifications()).toEqual([]);
  });

  it('adds a success notification with an incrementing id by default', () => {
    service.show('Saved');

    expect(service.notifications()).toEqual([
      { id: 1, message: 'Saved', type: 'success' },
    ]);
  });

  it('assigns distinct, increasing ids across calls', () => {
    service.show('First');
    service.show('Second');

    expect(service.notifications().map((n) => n.id)).toEqual([1, 2]);
  });

  it('auto-dismisses a success notification after 6 seconds', () => {
    service.show('Saved');

    vi.advanceTimersByTime(5999);
    expect(service.notifications()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.notifications()).toEqual([]);
  });

  it('keeps an error notification until it is dismissed', () => {
    service.show('Failed', 'error');

    vi.advanceTimersByTime(60_000);

    expect(service.notifications()).toEqual([
      { id: 1, message: 'Failed', type: 'error' },
    ]);
  });

  it('honors an explicit duration, leaving other notifications intact', () => {
    service.show('Short-lived', 'success', 1000);
    service.show('Long-lived', 'success', 5000);

    vi.advanceTimersByTime(1000);

    expect(service.notifications().map((n) => n.message)).toEqual([
      'Long-lived',
    ]);
  });

  it('dismiss(id) removes only the matching notification', () => {
    service.show('Keep me');
    service.show('Remove me');

    service.dismiss(service.notifications()[1].id);

    expect(service.notifications().map((n) => n.message)).toEqual(['Keep me']);
  });

  it('dismiss on an unknown id is a no-op', () => {
    service.show('Stays');

    expect(() => service.dismiss(9999)).not.toThrow();
    expect(service.notifications()).toHaveLength(1);
  });
});
