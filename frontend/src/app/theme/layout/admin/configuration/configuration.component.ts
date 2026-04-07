// Angular import
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Renderer2 } from '@angular/core';

// project import
import { AppConfig } from '../../../../app-config';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {
  renderer = inject(Renderer2);

  // public method
  styleSelectorToggle!: boolean; // open configuration menu
  setFontFamily!: string; // fontFamily

  // life cycle event
  ngOnInit(): void {
    this.setFontFamily = AppConfig.font_family;
    this.fontFamily(this.setFontFamily);
  }

  // public method
  fontFamily(font: string) {
    this.setFontFamily = font;
    this.renderer.removeClass(document.body, 'Roboto');
    this.renderer.removeClass(document.body, 'Poppins');
    this.renderer.removeClass(document.body, 'Inter');
    this.renderer.addClass(document.body, font);
  }
}
