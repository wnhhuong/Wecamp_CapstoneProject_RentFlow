import { isRouteErrorResponse, useRouteError } from 'react-router'

import { ErrorState } from '@/components/feedback'

function RouterErrorPage() {
  const error = useRouteError()

  const description = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'An unexpected navigation error occurred.'

  return (
    <div className="p-5 sm:p-8">
      <ErrorState
        title="Could not open this page"
        description={description}
      />
    </div>
  )
}

export { RouterErrorPage }