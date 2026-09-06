import { Observable, map, combineLatest, tap, shareReplay, switchMap  } from 'rxjs';
import { Component, ViewChild, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IndexService } from '../index.service';
import { IndexResponse, IndexQuery, SearchItem } from '../index.types';
import { RouterLink, SearchItemComponent } from '../search-item/search-item.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FilterPaneComponent } from '../filter-pane/filter-pane.component';
import { PagerComponent } from '../pager/pager.component';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';

@Component({
    imports: [
        CommonModule,
        RouterModule,
        FontAwesomeModule,
        FilterPaneComponent,
        SearchItemComponent,
        PagerComponent,
        LoaderComponent
    ],
    selector: 'app-search-page',
    templateUrl: './search-page.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./search-page.component.scss']
})
export class SearchPageComponent {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    svc = inject(IndexService);


    @ViewChild('results_container')
    resultsContainer?: ElementRef;

    filterset = '';
    indexQuery: Observable<IndexQuery>;
    response: Observable<IndexResponse>;
    filterpaneParams: Observable<FilterpaneParams>;
    pagerParams: Observable<PagerParams | null>;
    results: Observable<SearchItem[]>;
    facetCollapsed = false;

    constructor() {
        const route = this.route;
        const svc = this.svc;

        this.indexQuery = combineLatest([route.paramMap, route.queryParams]).pipe(map(([params, queryParams]) => {
            const filterset = params.get('filterset') || '';
            this.filterset = filterset;
            const query = queryParams['query'] || undefined;
            let page: number | undefined;
            if (queryParams['page']) {
                page = +(queryParams['page'] || 0);
            } else {
                page = undefined;
            }
            let libs: string[] | undefined = undefined;
            if (queryParams['lib'])
                libs = Array.isArray(queryParams['lib'])? queryParams['lib'] : [queryParams['lib']];
            let tags: string[] | undefined = undefined;
            if (queryParams['tag'])
                tags = Array.isArray(queryParams['tag'])? queryParams['tag'] : [queryParams['tag']];
            let p: string[] | undefined = undefined;
            if (queryParams['param'])
                p = Array.isArray(queryParams['param'])? queryParams['param'] : [queryParams['param']];
            let returns: string[] | undefined = undefined;
            if (queryParams['return'])
                returns = Array.isArray(queryParams['return'])? queryParams['return'] : [queryParams['return']];
            return {
                filterset,
                query,
                page,
                libs,
                tags,
                params: p,
                returns
            };
        }));
        this.response = this.indexQuery.pipe(
            switchMap(q => svc.query(q)),
            tap(() => {
                // collapse filter panel for small screens on query
                if (this.svc.facetCollapseOnSearch()) {
                    this.facetCollapsed = true;
                }
                if (this.resultsContainer)
                    this.resultsContainer.nativeElement.scroll({ 
                        top: 0, 
                        left: 0
                    });
            }),
            shareReplay(1)
        );
        this.filterpaneParams = combineLatest([this.indexQuery, this.response]).pipe(map(([query, response]) => {
            return {
                query,
                response
            };
        }));
        this.pagerParams = combineLatest([
            this.indexQuery, 
            this.response,
            svc.pageSize$
        ]).pipe(map(([query, response, pageSize]) => {
            if (pageSize == 0)
                return null;
            if (!response.total)
                return null;
            return {
                pageSize: pageSize,
                total: response.total,
                page: query.page || 1
            };
        }));
        this.results = this.response.pipe(
            map(resp => resp.items)
            /*,
            // break it down to chunks
            // so the app doesn't freeze on very large
            // content size
            switchMap(items => {
                return of(500).pipe(
                    expand(i => {
                        if (i - 500 > items.length)
                            return of();
                        return of(i + 500).pipe(
                            delay(30)
                        );
                    }),
                    map(i => {
                        const l = Math.min(i, items.length);
                        return items.slice(0, l);
                    })
                )
            })
           */
        );
    }

    onFacetCollapseChange(collapsed: boolean) {
        this.facetCollapsed = collapsed;
    }

    onPageClick(page: number) {
        this.router.navigate(
            [],
            {
                relativeTo: this.route,
                queryParams: { page },
                queryParamsHandling: 'merge'
            });
    }

    onQueryChange(query: IndexQuery) {
        this.router.navigate(
            [],
            {
                relativeTo: this.route,
                queryParams: {
                    query: query.query,
                    lib: query.libs,
                    param: query.params,
                    return: query.returns,
                    tag: query.tags,
                    page: query.page
                }
            });
    }

    seachItemRouterResolver(item: SearchItem, type: 'param' | 'return' | 'tag' | 'name' | 'lib', value: string): RouterLink | null {
        switch (type) {
            case 'name': {
                const name = item.kind == 'single'? item.name : item.entries[0].name;
                return {
                    routerLink: [`/filterset/${this.filterset}/${encodeURIComponent(item.lib)}/${encodeURIComponent(name)}`],
                    queryParams: {}
                };
            }
            case 'param':
                return {
                    routerLink: [],
                    queryParams: { 'return': value }
                };
            case 'return':
                return {
                    routerLink: [],
                    queryParams: { 'param': value }
                };
            case 'tag':
                return {
                    routerLink: [],
                    queryParams: { 'tag': value }
                };
            case 'lib':
                return {
                    routerLink: [],
                    queryParams: { 'lib': value }
                };
        }
    }
}

interface FilterpaneParams {
    query: IndexQuery;
    response: IndexResponse;
}

interface PagerParams {
    total: number;
    page: number;
    pageSize: number;
}
