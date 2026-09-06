import { Component, HostBinding, inject, ChangeDetectionStrategy, TemplateRef, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterModule  } from '@angular/router';
import { filter, map, Observable, startWith, combineLatest } from 'rxjs';
import { IndexService } from './index.service';
import { faHome, faSearch, faFile, faTimes, faCogs, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        FontAwesomeModule,
        ReactiveFormsModule
    ],
    selector: 'app-root',
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./app.component.scss']
})
export class AppComponent {

  navbarItems: Observable<NavbarItem[]>;

  settingsFragment = viewChild<TemplateRef<unknown>>('settings');

  settingsForm = new FormGroup({
      theme: new FormControl('default'),
      pagination: new FormControl('40')
  });

  faFile = faFile;
  faTimes = faTimes;

  constructor() {
      const filtersetSvc = inject(IndexService);
      const router = inject(Router);

      const routeChange = router.events.pipe(
          filter((event) => event instanceof NavigationEnd),
          startWith(router)
      );
      this.navbarItems = combineLatest([filtersetSvc.filtersets$, routeChange]).pipe(
          map(([filtersets, _]) => {
              return [{
                  label: 'Home',
                  icon: faHome,
                  link: '/',
                  isActive: router.isActive('/', {paths: 'exact', queryParams: 'exact', fragment: 'ignored', matrixParams: 'ignored'}),
                  items: []
              }, {
                  label: 'Search',
                  icon: faSearch,
                  isActive: router.isActive(router.parseUrl('/filterset'), {paths: 'subset', queryParams: 'subset', fragment: 'ignored', matrixParams: 'ignored'}),
                  items: filtersets.map(f => {
                      return {
                          label: f.name,
                          link: `filterset/${f.code}/search`,
                          isActive: false,
                          items: []
                      };
                  })
              }, {
                  label: 'Settings',
                  icon: faCogs,
                  isActive: false,
                  items: [],
                  fragment: this.settingsFragment(),
                  cssClass: 'settings'
              }];
          }));

      filtersetSvc.theme$.subscribe(t => {
          this.settingsForm.patchValue({ theme: t }, { emitEvent: false });
      });
      filtersetSvc.pageSize$.subscribe(p => {
          this.settingsForm.patchValue({ pagination: '' + p }, { emitEvent: false });
      });

      this.settingsForm.get('theme')!.valueChanges.subscribe(t => {
          if (t != null) {
              filtersetSvc.setTheme(t);
          }
      });
      this.settingsForm.get('pagination')!.valueChanges.subscribe(p => {
          if (p != null) {
              filtersetSvc.setPageSize(+p);
          }
      });
  }

  extraNavItemClass(i: NavbarItem): Record<string, boolean> {
      return i.cssClass? {[i.cssClass]: true} : {};
  }

  @HostBinding('class.theme-light')
  get lightTheme() {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const sel = this.settingsForm.value.theme;
      return sel == 'light' || (sel == 'default' && !prefersDark);
  }

  @HostBinding('class.theme-dark')
  get darkTheme() {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const sel = this.settingsForm.value.theme;
      return sel == 'dark' || (sel == 'default' && prefersDark);
  }

}

interface NavbarItem {
    label: string;
    link?: string;
    icon?: IconDefinition;
    externallink?: boolean;
    items: NavbarItem[];
    isActive: boolean;
    fragment?: TemplateRef<unknown>;
    cssClass?: string;
}
