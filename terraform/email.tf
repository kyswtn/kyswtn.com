locals {
  email_verification = "protonmail-verification=b3b33026ae7e42c8311de77ac43443fe6c773144"
  spf_mechanisms     = ["include:_spf.protonmail.ch"]
  mail_servers = [
    { priority = 10, value = "mail.protonmail.ch" },
    { priority = 20, value = "mailsec.protonmail.ch" }
  ]
  dkim_records = [
    {
      name  = "protonmail._domainkey",
      value = "protonmail.domainkey.ddsxv5srh7sx2dwge3zvd3ooykavju2wjtx7trucoqfavrvwehxsq.domains.proton.ch"
    },
    {
      name  = "protonmail2._domainkey",
      value = "protonmail2.domainkey.ddsxv5srh7sx2dwge3zvd3ooykavju2wjtx7trucoqfavrvwehxsq.domains.proton.ch"
    },
    {
      name  = "protonmail3._domainkey",
      value = "protonmail3.domainkey.ddsxv5srh7sx2dwge3zvd3ooykavju2wjtx7trucoqfavrvwehxsq.domains.proton.ch"
    }
  ]
  dmarc_policy = "quarantine"
}

resource "cloudflare_dns_record" "email_verification" {
  zone_id = cloudflare_zone.zone.id
  type    = "TXT"
  name    = "@"
  content = local.email_verification
  ttl     = 1
}

resource "cloudflare_dns_record" "spf" {
  zone_id = cloudflare_zone.zone.id
  type    = "TXT"
  name    = "@"
  content = "v=spf1 ${join(" ", local.spf_mechanisms)} mx ~all"
  ttl     = 1
}

resource "cloudflare_dns_record" "mx" {
  zone_id = cloudflare_zone.zone.id
  type    = "MX"
  name    = "@"
  for_each = {
    for _, mx in local.mail_servers :
    // Use server priority as resource name suffix here.
    mx.priority => mx.value
  }
  priority = each.key
  content  = each.value
  ttl      = 1
}

resource "cloudflare_dns_record" "dkim" {
  zone_id = cloudflare_zone.zone.id
  type    = "CNAME"
  proxied = false
  for_each = {
    for _, dkim in local.dkim_records :
    // Use dkim hostname as resource name suffix here.
    dkim.name => dkim.value
  }
  name    = each.key
  content = each.value
  ttl     = 1
}

resource "cloudflare_dns_record" "dmarc" {
  zone_id = cloudflare_zone.zone.id
  type    = "TXT"
  name    = "_dmarc"
  content = "v=DMARC1; p=${local.dmarc_policy}"
  ttl     = 1
}
