import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { SearchItem } from '../index.types';
import { SearchItemComponent } from '../search-item/search-item.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dash-entry',
  imports: [
    SearchItemComponent
  ],
  template: `
    @if (item(); as i) {
      <app-search-item [routerResolver]="routerResolver" [searchitem]="i"/>
    }
  `,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .theme-dark {
        --text-color-against-accent: black;
        --text-color-against-bg: white;
        --text-color-muted: #ccc;
        --bg-color: #303030;
        --bg-color2: #404040;
        --accent-color: #e77;
        --secondary-color: #aae;
        --tertary-color: #6d6;
        --nav-bg-color: var(--bg-color);
        --nav-text-color: var(--text-color-against-bg);
        --tag-color: white;
        --tag-bg-color: #555;
    }
    app-search-item {
        color: var(--text-color-against-bg);
    }
  `
  
})
export class DashEntryComponent {

  item = signal<null | SearchItem>(null);
  routerResolver = () => null;
  
}
