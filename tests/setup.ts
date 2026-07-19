import "@testing-library/jest-dom/vitest"

// jsdom não implementa essas APIs de Pointer Events / scroll, usadas pelo
// Radix Select (@radix-ui/react-select) internamente para posicionar o popup
// e capturar o ponteiro. Sem os stubs, qualquer interação com <Select> em
// teste lança "target.hasPointerCapture is not a function".
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
