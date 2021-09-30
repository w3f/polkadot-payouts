export const getErrorMessage = (error: unknown): string => {
  let errorString: string
  if (typeof error === "string") {
    errorString = error
  } else if (error instanceof Error) {
    errorString = error.message 
  }
  return errorString
}