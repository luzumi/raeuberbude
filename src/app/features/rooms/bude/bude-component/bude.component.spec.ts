import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MenuComponent } from '@shared/components/menu/menu';
import { BudeComponent } from './bude.component';

/**
 * Vereinfachte Tests für das Bude-Dashboard nach der Umstellung auf das Grid-Layout.
 */
describe('BudeComponent', () => {
  let component: BudeComponent;
  let fixture: ComponentFixture<BudeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudeComponent, CommonModule, MenuComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BudeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initially shows no active device and closed menu', () => {
    expect(component.activeIndex).toBeNull();
    expect(component.menuOpen).toBeFalse();
  });

  it('opens the menu via onMenuButtonClick()', () => {
    component.onMenuButtonClick();
    expect(component.menuOpen).toBeTrue();
    expect(component.activeIndex).toBeNull();
  });

  it('closeMenu() closes the menu again', () => {
    component.menuOpen = true;
    component.closeMenu();
    expect(component.menuOpen).toBeFalse();
  });

  it('onBack() resets the active device', () => {
    component.activeIndex = 2;
    component.onBack();
    expect(component.activeIndex).toBeNull();
  });

  it('getMenuGradient() returns a gradient string', () => {
    expect(component.getMenuGradient()).toContain('radial-gradient');
  });
});
