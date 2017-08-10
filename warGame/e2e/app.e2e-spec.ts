import { WarGamePage } from './app.po';

describe('war-game App', () => {
  let page: WarGamePage;

  beforeEach(() => {
    page = new WarGamePage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
