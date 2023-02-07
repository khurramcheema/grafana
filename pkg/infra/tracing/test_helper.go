package tracing

import (
	"context"
	"net/http"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

func InitializeTracerForTest() Tracer {
	ots := &Opentelemetry{enabled: noopExporter}
	_ = ots.initOpentelemetryTracer()
	return ots
}

type FakeSpan struct {
	Name string

	Ended       bool
	Attributes  map[attribute.Key]attribute.Value
	StatusCode  codes.Code
	Description string
	Err         error
	Events      map[string]EventValue
}

func newFakeSpan(name string) *FakeSpan {
	return &FakeSpan{
		Name:       name,
		Attributes: map[attribute.Key]attribute.Value{},
		Events:     map[string]EventValue{},
	}
}

func (t *FakeSpan) End() {
	t.Ended = true
}

func (t *FakeSpan) SetAttributes(key string, value interface{}, kv attribute.KeyValue) {
	t.Attributes[kv.Key] = kv.Value
}

func (t *FakeSpan) SetName(name string) {
	t.Name = name
}

func (t *FakeSpan) SetStatus(code codes.Code, description string) {
	t.StatusCode = code
	t.Description = description
}

func (t *FakeSpan) RecordError(err error, options ...trace.EventOption) {
	t.Err = err
}

func (t *FakeSpan) AddEvents(keys []string, values []EventValue) {
	if len(keys) != len(values) {
		panic("different number of keys and values")
	}
	for i := 0; i < len(keys); i++ {
		t.Events[keys[i]] = values[i]
	}
}

type FakeTracer struct {
	Spans []*FakeSpan
}

func (t *FakeTracer) Run(ctx context.Context) error {
	return nil
}

func (t *FakeTracer) Start(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, Span) {
	span := newFakeSpan(spanName)
	t.Spans = append(t.Spans, span)
	return ctx, span
}

func (t *FakeTracer) Inject(ctx context.Context, header http.Header, span Span) {
}

func NewFakeTracer() *FakeTracer {
	return &FakeTracer{Spans: []*FakeSpan{}}
}
