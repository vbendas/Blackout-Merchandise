# Operations

Production pipeline, facility planning, and operational procedures.

---

## Documents

| Document | Purpose |
|----------|---------|
| [[Production-Automation]] | Screen print automation pipeline (OpenCV, color separation, halftoning) |
| [[Production-Automation-Reference]] | Technical reference for Phase 8+ development |
| [[Contingency-Plans]] | Viral spikes, equipment failure, bulk drops |
| [[Color-Separation-Reference]] | Color separation algorithms and Pantone matching |
| [[ML-Training-Reference]] | ML training pipeline for design quality scoring |

---

## Production Pipeline

```
Design (FLUX 2) → OpenCV Color Separation → Halftoning → Print-Ready Files
                                    ↓
                          Mockup Generation (Cloudinary)
```

**Cost per design:** ~$0.05 (AI) vs €45 (manual)

---

*Last Updated: May 2026*
