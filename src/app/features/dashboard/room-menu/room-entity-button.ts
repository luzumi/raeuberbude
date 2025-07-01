export class RoomEntityButton {
  name: string = '';
  icon: string = 'alert';         // Material Icon
  svgIcon: string = 'assets';      // Optional: Pfad zum SVG
  color?: string;
  active_color?: string;
  active = false;
  left: number = 0;
  top: number = 0;

  constructor(
    name: string = '',
    icon: string = '',
    color: string = '',
    active_color: string = '',
    active: boolean = false,
    svgIcon?: string
  ) {
    this.name = name;
    this.icon = icon;
    this.color = color;
    this.active_color = active_color;
    this.active = active;
    if (svgIcon) {
      this.svgIcon = svgIcon;
    }
  }
}
