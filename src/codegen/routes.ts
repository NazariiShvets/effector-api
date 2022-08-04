import type { Effect } from 'effector/effector.cjs';
import type { AxiosError } from 'axios';
import type { MockOptions, RouteOptions } from './types';
import { Route } from './route';
import type { ShapeConfig } from './lib/typescript';

type RouteMocksConfig<Shape> = {
  [Key in keyof Shape]: Shape[Key] extends Route<infer D, infer C>
    ? MockOptions<D, C>
    : RouteMocksConfig<Shape[Key]>;
};

type RouteOptionsConfig<Shape> = {
  [Key in keyof Shape]: Shape[Key] extends Route<any, any>
    ? RouteOptions
    : RouteOptionsConfig<Shape[Key]>;
};

type MockOptionsFromRoute<TRoute> = TRoute extends Route<infer D, infer C>
  ? MockOptions<D, C>
  : TRoute;

class Routes<
  Shape extends ShapeConfig<object, Route<any, any>>,
  MockShape extends RouteMocksConfig<Shape>,
  OptionsShape extends RouteOptionsConfig<Shape>
> {
  public constructor(private readonly routes: Shape) {}

  private _mocks: MockShape | undefined;

  private _options: OptionsShape | undefined;

  public mocks = (mocks: MockShape) => {
    this._mocks = mocks;
  };

  public options = (options: OptionsShape) => {
    this._options = options;
  };

  public build = () => {
    type GetRoutesShape<RShape> = {
      [Key in keyof RShape]: RShape[Key] extends Route<
        infer Dto,
        infer Contract
      >
        ? Effect<Dto, Contract, AxiosError<Contract, Dto>>
        : GetRoutesShape<RShape[Key]>;
    };

    function isMock<V extends Route<any, any>>(
      value: V,
      mock?: unknown
    ): mock is MockOptionsFromRoute<V> {
      return !!mock;
    }

    function traverse<
      S extends Shape,
      M extends MockShape,
      O extends OptionsShape
    >(base: S, mocks: M, options: O) {
      return Object.entries(base).reduce((map, [key, value]) => {
        if (value instanceof Route) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          const mock = mocks?.[key];

          if (isMock(value, mock)) {
            value.mock(mock);
          }

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          const routeOptions = options?.[key];

          if (routeOptions) {
            value.options(routeOptions);
          }

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          map[key] = value.build();

          return map;
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        map[key] = traverse(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          base[key],
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          mocks?.[key] ?? {},
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          options?.[key] ?? {}
        );

        return map;
      }, {});
    }

    return traverse(
      this.routes,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this._mocks ?? {},
      this._options ?? {}
    ) as GetRoutesShape<Shape>;
  };
}

export { Routes };
