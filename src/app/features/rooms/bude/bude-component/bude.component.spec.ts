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

    it('should return 20%×33% at left=80%, top=0% when menuOpen=true', () => {
      component.menuOpen = true;
      component.activeIndex = null;
      const style = component.getMenuStyle();
      expect(style['width']).toBe('20%');
      expect(style['height']).toBe('33%');
      expect(style['left']).toBe('80%');
      expect(style['top']).toBe('0%');
      expect(style['border-radius']).toBe('8px');
      expect(style['z-index']).toBe('4');
    });

    it('should also return 20%×33% at left=80%, top=0% when a device is active', () => {
      component.menuOpen = false;
      component.activeIndex = 1;
      const style = component.getMenuStyle();
      expect(style['width']).toBe('20%');
      expect(style['height']).toBe('33%');
      expect(style['left']).toBe('80%');
      expect(style['top']).toBe('0%');
      expect(style['border-radius']).toBe('8px');
      expect(style['z-index']).toBe('4');
    });
  });

  describe('getMenuComponentStyle()', () => {
    it('should return full-width × 67% height at left=0%, top=33%', () => {
      const style = component.getMenuComponentStyle();
      expect(style['width']).toBe('100%');
      expect(style['height']).toBe('67%');
      expect(style['left']).toBe('0%');
      expect(style['top']).toBe('33%');
      expect(style['border-radius']).toBe('8px');
      expect(style['z-index']).toBe('5');
    });
  });

  describe('getStyle() when menuOpen=true', () => {
    beforeEach(() => {
      component.menuOpen = true;
      component.activeIndex = null;
    });

    it('should hide devices by setting width and height to 0%', () => {
      component.devices.forEach((dev, idx) => {
        const style = component.getStyle(dev, idx);
        expect(style['width']).toBe('0%');
        expect(style['height']).toBe('0%');
        expect(style['z-index']).toBe('0');
      });
    });
  });

  describe('getStyle() when menuOpen=false', () => {
    beforeEach(() => {
      component.menuOpen = false;
    });

    it('should place all devices in circle when none is active', () => {
      component.activeIndex = null;
      component.devices.forEach((dev, idx) => {
        const style = component.getStyle(dev, idx);
        expect(style['position']).toBe('absolute');
        expect(style['width']).toBe('20%');
        expect(style['height']).toBe('20%');
        expect(style['left']).toBe(`${dev.left}%`);
        expect(style['top']).toBe(`${dev.top}%`);
        expect(style['transform']).toBe('translate(-50%, -50%)');
        expect(style['z-index']).toBe('1');
      });
    });

    it('should stack the other four devices in top 33% bar when a device is active', () => {
      component.activeIndex = 2;
      const inactiveOrder = component.devices
        .map((_, i) => i)
        .filter(i => i !== 2);

      inactiveOrder.forEach((idx, pos) => {
        const style = component.getStyle(component.devices[idx], idx);
        expect(style['width']).toBe('20%');
        expect(style['height']).toBe('33%');
        const expectedLeft = pos * 20;
        expect(style['left']).toBe(`${expectedLeft}%`);
        expect(style['top']).toBe('0%');
        expect(style['z-index']).toBe('3');
      });
    });

    it('should expand the clicked device to full width and 67% height under the bar', () => {
      component.activeIndex = 1;
      const style = component.getStyle(component.devices[1], 1);
      expect(style['position']).toBe('absolute');
      expect(style['width']).toBe('100%');
      expect(style['height']).toBe('67%');
      expect(style['left']).toBe('0%');
      expect(style['top']).toBe('33%');
      expect(style['z-index']).toBe('5');
    });
  });
});
