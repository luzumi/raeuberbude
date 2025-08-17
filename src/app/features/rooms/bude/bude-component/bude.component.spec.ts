import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MenuComponent } from '@shared/components/menu/menu';
import { BudeComponent } from './bude.component';

describe('BudeComponent (with Menu)', () => {
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

  describe('menuOpen behavior', () => {
    it('should start with menuOpen = false and no activeIndex', () => {
      expect(component.menuOpen).toBeFalse();
      expect(component.activeIndex).toBeNull();
    });

    it('onMenuButtonClick should set menuOpen true and reset activeIndex', () => {
      component.activeIndex = 2;
      component.onMenuButtonClick();
      expect(component.menuOpen).toBeTrue();
      expect(component.activeIndex).toBeNull();
    });

    it('closeMenu should set menuOpen false', () => {
      component.menuOpen = true;
      component.closeMenu();
      expect(component.menuOpen).toBeFalse();
    });
  });

  describe('getMenuStyle()', () => {
    it('should return centered 10% square when menuOpen=false and no device active', () => {
      component.menuOpen = false;
      component.activeIndex = null;
      const style = component.getMenuStyle();
      expect(style['width']).toBe('10%');
      expect(style['height']).toBe('10%');
      expect(style['left']).toBe('50%');
      expect(style['top']).toBe('50%');
      expect(style['border-radius']).toBe('50%');
      expect(style['z-index']).toBe('2');
    });

    it('should return 20%×20% at left=80%, top=0% when menuOpen=true', () => {
      component.menuOpen = true;
      component.activeIndex = null;
      const style = component.getMenuStyle();
      expect(style['width']).toBe('20%');
      expect(style['height']).toBe('20%');
      expect(style['left']).toBe('80%');
      expect(style['top']).toBe('0%');
      expect(style['border-radius']).toBe('8px');
      expect(style['z-index']).toBe('4');
    });

    it('should also return 20%×20% at left=80%, top=0% when a device is active', () => {
      component.menuOpen = false;
      component.activeIndex = 1;
      const style = component.getMenuStyle();
      expect(style['width']).toBe('20%');
      expect(style['height']).toBe('20%');
      expect(style['left']).toBe('80%');
      expect(style['top']).toBe('0%');
      expect(style['border-radius']).toBe('8px');
      expect(style['z-index']).toBe('4');
    });
  });

  describe('getMenuComponentStyle()', () => {
    it('should return full-width × 80% height at left=0%, top=20%', () => {
      const style = component.getMenuComponentStyle();
      expect(style['width']).toBe('100%');
      expect(style['height']).toBe('80%');
      expect(style['left']).toBe('0%');
      expect(style['top']).toBe('20%');
      expect(style['border-radius']).toBe('8px');
      expect(style['z-index']).toBe('5');
    });
  });
});
