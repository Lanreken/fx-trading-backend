import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns service status payload', () => {
    const controller = new AppController();

    expect(controller.getRoot()).toEqual({
      name: 'FX Trading Backend',
      status: 'ok',
    });
  });
});
