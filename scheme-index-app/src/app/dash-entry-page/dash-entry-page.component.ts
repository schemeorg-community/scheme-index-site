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
    app-search-item {
        font-family: Roboto;
        color: var(--text-color-against-bg);
    }
  `
  
})
export class DashEntryComponent {

  item = signal<null | SearchItem>(null);
  routerResolver = () => null;
  
}
