/* 
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  
  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  
      http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { BasicHttpError, BasicHttpResponse } from 'shared_types';
import { AsyncHandlerObj } from 'shared_types/src/middleware-chain';
import { container, InjectionToken } from 'tsyringe';
import { LoggingContext } from './context-logging-middleware';
import { RouteData } from './RouteData';

export class Router<TResponse extends BasicHttpResponse>
    implements AsyncHandlerObj<APIGatewayProxyEvent, BasicHttpResponse> {
    private routes: RouteData<
        TResponse,
        AsyncHandlerObj<APIGatewayProxyEvent, TResponse>
    >[] = [];

    addRoute<THandler extends AsyncHandlerObj<APIGatewayProxyEvent, TResponse>>(
        predicate: (event: APIGatewayProxyEvent) => boolean,
        handlerToken: InjectionToken<THandler>
    ): Router<TResponse> {
        this.routes.push({ predicate, handlerToken: handlerToken });
        return this;
    }

    handle(event: APIGatewayProxyEvent, context: Context): Promise<BasicHttpResponse> {
        const route = this.routes.find((r) => r.predicate(event));

        if (route) {
            const iocContainer =
                (context as LoggingContext)?.loggingContextContainer ?? container;

            return iocContainer.resolve(route.handlerToken).handle(event, context);
        }

        return new Promise((resolve) =>
            resolve(
                BasicHttpResponse.ofError(
                    new BasicHttpError(
                        404,
                        `Could not find a matching route for ${event.httpMethod} ${event.resource} ${event.path}`,
                        false
                    )
                )
            )
        );
    }
}
