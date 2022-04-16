import {handleAjax} from "./common.js";

const { fromEvent } = rxjs;
const { ajax } = rxjs.ajax;
const { 
  debounceTime, 
  map, 
  distinctUntilChanged, 
  share,
  partition,
  tap,
  switchMap,
  pluck,
  retry,
  finalize,
  merge
} = rxjs.operators;

export default class AutoComplete {
  constructor($autocomplete) {
    this.$input = $autocomplete.querySelector("input");
    this.$layer = $autocomplete.querySelector(".layer"); 
    this.$loading = $autocomplete.querySelector(".loading");

    // 2. 1에서 방출한 keyup 이벤트를 받아 상황에 따른 observable 분리
    let [search$, reset$] = this.createKeyup$().pipe(partition(query => query.trim().length > 0));

    // 2-1. 검색어가 있는 search$ observable
    search$ = search$
    .pipe(
        tap(() => console.log('search$')),
        tap(() => this.showLoading()),
        switchMap(query => ajax.getJSON(`/bus/${query}`)),
        handleAjax("busRouteList"),
        retry(2),
        tap(() => this.hideLoading()),
        finalize(() => this.reset())
    );

    // 2-2. 검색어가 없는 reset$ observable
    reset$ = reset$.pipe(
      tap(() => console.log('reset$')),
      // 이벤트 위임 구현 : closest로 가장 가까운 부모 요소를 반환
      merge(fromEvent(this.$layer, "click", (evt) => evt.target.closest("li")))
    );

    // 3-1. search$ observable이 값 방출 후 검색 결과 렌더링 : Observer 구현
    search$.subscribe(items => this.render(items));

    // 3-2. reset$ observable이 값 방출 후 리셋 : Observer 구현
    reset$.subscribe(() => this.reset());
  }

  // 1. observable 데이터를 방출할 액션 만들기
  createKeyup$() {
    return fromEvent(this.$input, "keyup")
      .pipe(
          debounceTime(300),
          map(event => event.target.value),
          distinctUntilChanged(),
          // constructor에서 partition으로 search$, reset$ 2개의 observable로 나누어짐. 
          // 각각의 observable이 데이터를 함께 공유받을 수 있도록 처리
          share()
      );
  }
  showLoading() {
    this.$loading.style.display = "block";
  }
  hideLoading() {
      this.$loading.style.display = "none";
  }  
  render(buses) {
    this.$layer.innerHTML = buses.map(bus => {
        return `<li>
          <a href="#${bus.routeId}_${bus.routeName}">
              <strong>${bus.routeName}</strong>
              <span>${bus.regionName}</span>
              <div>${bus.routeTypeName}</div>
          </a>
        </li>`;
    }).join("");
    this.$layer.style.display = "block";
  }  
  reset() {
    this.hideLoading();
    this.$layer.style.display = "none";
  }  
};
