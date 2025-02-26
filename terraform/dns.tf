resource "cloudflare_dns_record" "atproto_verification" {
  zone_id = cloudflare_zone.zone.id
  type    = "TXT"
  name    = "_atproto"
  content = "did=did:plc:43k26c4pv44adwhpndyxgtpm"
  ttl     = 1
}
