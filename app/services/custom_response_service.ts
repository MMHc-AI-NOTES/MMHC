export const sendSuccess = (message = '', data: any = {}, type?: any) => {
  return {
    status: true,
    message: message,
    data: data,
    ...(type && { type }),
  }
}

export const sendError = (message = '', data: any = {}) => {
  const formattedMessage = Array.isArray(message)
    ? message
    : [{ message, rule: 'unknown', field: 'unknown' }]
  return {
    status: false,
    message: 'Something went wrong',
    data: data,
    errors: formattedMessage,
  }
}
